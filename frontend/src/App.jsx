import { useState, useEffect, useRef } from 'react';
import axiosDirect from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './App.css';

const axios = axiosDirect.create();

const API_URL = 'https://zany-happiness-v6qrjxw4qr6p3r75-8000.app.github.dev';
const GOOGLE_CLIENT_ID = "879431588451-320u19m4iff56p1i1r0488a0m82u2mic.apps.googleusercontent.com";

const theme = { 
  verdeIF: '#2F9E41', vermelhoIF: '#CD191E', fundo: '#F2F5F3', 
  branco: '#FFFFFF', textoBase: '#333333', borda: '#E0E0E0', 
  sombra: '0 4px 12px rgba(0,0,0,0.08)' 
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [loginPortal, setLoginPortal] = useState(null); 
  
  const [activeTab, setActiveTab] = useState(() => {
    const role = localStorage.getItem('userRole');
    if (role === 'fiscal') return 'validacao';
    if (role === 'admin') return 'configuracoes';
    if (role === 'gestor') return 'estatisticas';
    if (role === 'empresa') return 'dashboard_cantina';
    return 'alunos';
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // ESTADOS DO ALUNO E MODO EDIÇÃO
  const [students, setStudents] = useState([]);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [nome, setNome] = useState(''); 
  const [matricula, setMatricula] = useState(''); 
  const [curso, setCurso] = useState(''); 
  const [turma, setTurma] = useState(''); 
  const [foto, setFoto] = useState(null);
  
  const [leituraFisica, setLeituraFisica] = useState('');
  const [resultadoCatraca, setResultadoCatraca] = useState(null);
  const [matriculaManual, setMatriculaManual] = useState('');
  const [textoOcorrencia, setTextoOcorrencia] = useState('');
  const [gravandoOcorrencia, setGravandoOcorrencia] = useState(false);
  const [totalRefeicoes, setTotalRefeicoes] = useState(0);

  const [dashData, setDashData] = useState(null);
  const [relatorioDiario, setRelatorioDiario] = useState([]);
  
  const [ocorrencias, setOcorrencias] = useState([]);
  const [sysConfig, setSysConfig] = useState({ valor_refeicao: 6.50, horario_inicio: '11:30', horario_fim: '14:00' });
  const [historicoValidacao, setHistoricoValidacao] = useState([]);
  const [protocoloGerado, setProtocoloGerado] = useState(null);

  const [reportType, setReportType] = useState('diario'); 
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0]); 

  const timerRef = useRef(null);

  const fecharResultado = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResultadoCatraca(null); setTextoOcorrencia('');
    setTimeout(() => document.getElementById('leitorInvisivel')?.focus(), 100);
  };
  const pausarTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    if (type === 'diario') setFilterValue(new Date().toISOString().split('T')[0]);
    else if (type === 'mensal') setFilterValue('2026-06');
    else setFilterValue('');
  };

  const baixarRelatorio = (formato) => {
    const url = `${API_URL}/relatorios/exportar/${formato}?tipo=${reportType}&filtro=${filterValue}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    let ws;
    if (token && (userRole === 'empresa' || userRole === 'operador' || userRole === 'fiscal' || userRole === 'admin')) {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/refeicoes';
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => { if (event.data) setTotalRefeicoes(parseInt(event.data)); };
      } catch (err) {}
    }
    return () => { if (ws) ws.close(); };
  }, [token, userRole]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (userRole === 'empresa') axios.get(`${API_URL}/stats/dashboard`).then(res => setDashData(res.data)).catch(e => console.error(e));
      if (['admin', 'gestor'].includes(userRole)) fetchStudents(); 
      if (['admin', 'fiscal'].includes(userRole)) fetchConfigs();
      if (activeTab === 'relatorios') fetchRelatorioDiario();
      if (activeTab === 'ocorrencias') fetchOcorrencias();
      if (activeTab === 'validacao') fetchHistoricoValidacao();
    }
  }, [token, userRole, activeTab]);

  const fetchStudents = async () => { try { const res = await axios.get(`${API_URL}/students`); setStudents(res.data || []); } catch (err) {} };
  const fetchRelatorioDiario = async () => { try { const res = await axios.get(`${API_URL}/relatorios/diario`); setRelatorioDiario(res.data || []); } catch (err) {} };
  const fetchOcorrencias = async () => { try { const res = await axios.get(`${API_URL}/ocorrencias`); setOcorrencias(res.data || []); } catch (err) {} };
  const fetchConfigs = async () => { try { const res = await axios.get(`${API_URL}/config`); setSysConfig(res.data); } catch (err) {} };
  const fetchHistoricoValidacao = async () => { try { const res = await axios.get(`${API_URL}/validacao/historico`); setHistoricoValidacao(res.data || []); } catch (err) {} };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data?.access_token) {
        setToken(res.data.access_token); setUserRole(loginPortal); 
        let targetTab = 'alunos';
        if (loginPortal === 'fiscal') targetTab = 'validacao';
        if (loginPortal === 'admin') targetTab = 'configuracoes';
        if (loginPortal === 'gestor') targetTab = 'estatisticas';
        if (loginPortal === 'empresa') targetTab = 'dashboard_cantina';
        setActiveTab(targetTab); 
        localStorage.setItem('token', res.data.access_token); localStorage.setItem('userRole', loginPortal);
      }
    } catch (err) { alert("E-mail ou senha incorretos!"); }
  };

  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/config`, sysConfig);
      alert("Configurações atualizadas com sucesso!");
    } catch (err) { alert("Erro ao salvar configurações."); }
  };

  const handleFecharMes = async () => {
    if(!window.confirm("Atenção: Você está prestes a emitir o protocolo de baixa para este mês. Deseja prosseguir?")) return;
    const mesAno = new Date().toISOString().slice(0, 7);
    const valorPrato = sysConfig.valor_refeicao || 6.50;
    try {
      const res = await axios.post(`${API_URL}/validacao/fechar`, { mes_ano: mesAno, total_refeicoes: totalRefeicoes, valor_total: totalRefeicoes * valorPrato });
      setProtocoloGerado(res.data.protocolo);
      fetchHistoricoValidacao();
    } catch (err) { alert("Erro ao gerar protocolo de baixa."); }
  };

  const verificarBiometria = async (hexCode) => {
    pausarTimer();
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { hex_code: hexCode });
      setResultadoCatraca(res.data || { status: 'negado' }); timerRef.current = setTimeout(fecharResultado, 5000); 
    } catch (err) { setResultadoCatraca({ status: 'negado' }); timerRef.current = setTimeout(fecharResultado, 3000); }
  };

  const handleKeyDownLeitor = (e) => { if (e.key === 'Enter') { verificarBiometria(leituraFisica); setLeituraFisica(''); } };

  const handleLiberarManual = async (e) => {
    e.preventDefault(); if (!matriculaManual.trim()) return;
    pausarTimer();
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { matricula: matriculaManual });
      setResultadoCatraca(res.data || { status: 'negado' }); setMatriculaManual(''); timerRef.current = setTimeout(fecharResultado, 5000); 
    } catch (err) { setResultadoCatraca({ status: 'negado' }); timerRef.current = setTimeout(fecharResultado, 3000); } finally { document.getElementById('leitorInvisivel')?.focus(); }
  };

  const handleSalvarOcorrencia = async (e) => {
    e.preventDefault(); if (!textoOcorrencia.trim() || !resultadoCatraca?.aluno?.id) return;
    setGravandoOcorrencia(true);
    try {
      await axios.post(`${API_URL}/students/${resultadoCatraca.aluno.id}/ocorrencias`, { descricao: textoOcorrencia });
      alert("Ocorrência registrada!"); fecharResultado();
    } catch (err) { alert("Erro na requisição."); } finally { setGravandoOcorrencia(false); document.getElementById('leitorInvisivel')?.focus(); }
  };

  const handleEditClick = (student) => {
    setEditingStudentId(student.id);
    setNome(student.nome);
    setMatricula(student.matricula);
    setCurso(student.curso);
    setTurma(student.turma);
    setFoto(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setNome(''); setMatricula(''); setCurso(''); setTurma(''); setFoto(null);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nome', nome); formData.append('matricula', matricula); 
    formData.append('curso', curso); formData.append('turma', turma);
    if (foto) formData.append('foto', foto);

    try {
      if (editingStudentId) {
        await axios.put(`${API_URL}/students/${editingStudentId}`, formData);
        alert("Estudante atualizado com sucesso!");
      } else {
        await axios.post(`${API_URL}/students`, formData);
        alert("Estudante cadastrado com sucesso!");
      }
      handleCancelEdit();
      fetchStudents();
    } catch (err) { alert("Erro ao salvar estudante."); }
  };

  const inputStyle = { padding: '12px', borderRadius: '6px', border: `1px solid ${theme.borda}`, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const cardStyle = { background: theme.branco, padding: '25px', borderRadius: '12px', boxShadow: theme.sombra, borderTop: `4px solid ${theme.verdeIF}` };
  
  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="app-container" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }} className="animate-fade">
            <h1 style={{ color: theme.verdeIF, margin: 0, fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>SCAVRE</h1>
            <p style={{ color: '#64748B', marginTop: '8px', fontSize: '18px', fontWeight: 500 }}>Controle de Acesso e Voucher Escolar | IFB</p>
          </div>
          
          {!loginPortal ? (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px' }} className="animate-fade">
              {[
                { id: 'operador', icone: '📟', texto: 'Operador / Catraca', cor: theme.verdeIF },
                { id: 'empresa', icone: '🏢', texto: 'Empresa (Cantina)', cor: '#F57C00' },
                { id: 'fiscal', icone: '👮', texto: 'Fiscal de Contrato', cor: '#1976D2' },
                { id: 'gestor', icone: '🧑‍🏫', texto: 'Gestão Educacional', cor: '#9C27B0' },
                { id: 'admin', icone: '⚙️', texto: 'Administrador TI', cor: '#333333' }
              ].map(p => (
                <button 
                  key={p.id} 
                  onClick={() => setLoginPortal(p.id)} 
                  className="card-glass"
                  style={{ width: '220px', padding: '30px 20px', borderTop: `6px solid ${p.cor}`, cursor: 'pointer', textAlign: 'center' }}
                >
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{p.icone}</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B' }}>{p.texto}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="card-glass animate-fade" style={{ width: '380px' }}>
              <button onClick={() => setLoginPortal(null)} style={{ background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', marginBottom: '24px', fontWeight: 600 }}>⬅️ Voltar aos perfis</button>
              
              {['fiscal', 'admin'].includes(loginPortal) ? (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: '20px', color: '#1E293B' }}>Acesso Institucional ({loginPortal.toUpperCase()})</h3>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin onSuccess={async (res) => {
                      const backRes = await axios.post(`${API_URL}/auth/google`, { token: res.credential, portal: loginPortal });
                      if (backRes.data?.access_token) {
                        setToken(backRes.data.access_token); setUserRole(backRes.data.role); 
                        let targetTab = 'alunos';
                        if (backRes.data.role === 'fiscal') targetTab = 'validacao';
                        if (backRes.data.role === 'admin') targetTab = 'configuracoes';
                        setActiveTab(targetTab); 
                        localStorage.setItem('token', backRes.data.access_token); localStorage.setItem('userRole', backRes.data.role);
                      }
                    }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ color: loginPortal === 'gestor' ? '#9C27B0' : theme.verdeIF, fontWeight: 800 }}>Acesso {loginPortal.toUpperCase()}</h3>
                  <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="modern-input" type="email" required />
                  <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="modern-input" required />
                  <button type="submit" className="interactive-btn" style={{ backgroundColor: loginPortal === 'gestor' ? '#9C27B0' : theme.verdeIF, color: 'white', width: '100%' }}>Entrar de forma segura</button>
                </form>
              )}
            </div>
          )}
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="app-container">
      <header style={{ background: `linear-gradient(135deg, ${userRole === 'empresa' ? '#F57C00' : userRole === 'gestor' ? '#9C27B0' : userRole === 'admin' ? '#333' : userRole === 'fiscal' ? '#1976D2' : theme.verdeIF}, #1A5325)`, color: 'white', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>SCAVRE <span style={{fontSize: '14px', marginLeft: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600}}>Perfil: {userRole.toUpperCase()}</span></h2>
        <button onClick={() => { setToken(null); localStorage.clear(); window.location.reload(); }} className="interactive-btn" style={{ backgroundColor: theme.vermelhoIF, color: 'white', padding: '8px 20px' }}>Sair com segurança</button>
      </header>

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* VISÃO: EMPRESA (CANTINA CONTRATADA) - RESTAURADA E ESTILIZADA */}
        {userRole === 'empresa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              <div className="card-glass" style={{ borderTopColor: '#F57C00' }}>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>REFEIÇÕES HOJE (CATRACA)</div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#F57C00', marginTop: '6px' }}>{totalRefeicoes}</div>
              </div>
              <div className="card-glass" style={{ borderTopColor: theme.verdeIF }}>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>MÉDIA DIÁRIA DA SEMANA</div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: theme.verdeIF, marginTop: '6px' }}>{dashData?.media_diaria || 0}</div>
              </div>
              <div className="card-glass" style={{ borderTopColor: '#1976D2' }}>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>FATURAMENTO SEMANAL ESTIMADO</div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#1976D2', marginTop: '6px' }}>
                  R$ {dashData?.faturamento_semana ? dashData.faturamento_semana.toFixed(2).replace('.', ',') : '0,00'}
                </div>
              </div>
            </div>

            <div className="card-glass" style={{ borderTopColor: '#F57C00' }}>
              <h3 style={{ fontWeight: 800, color: '#1E293B', marginBottom: '20px' }}>📊 Balanço de Fornecimento Semanal</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '220px', padding: '20px 10px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                {(dashData?.grafico_semanal || []).map((g, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#F57C00', marginBottom: '6px' }}>{g.refeicoes}</div>
                    <div style={{ width: '100%', height: `${Math.min((g.refeicoes / 400) * 100, 100)}%`, background: `linear-gradient(to top, #F57C00, #FFB74D)`, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }}></div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginTop: '8px' }}>{g.dia}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* OPERADOR CATRACA */}
        {userRole === 'operador' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }} className="animate-fade">
             <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <div className="card-glass pulse-active" style={{ background: theme.verdeIF, color: 'white', padding: '16px 30px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: 'none' }}>
                <span style={{ fontSize: '36px' }}>🍽️</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>REFEIÇÕES SERVIDAS HOJE</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, textAlign: 'right' }}>{totalRefeicoes}</div>
                </div>
              </div>
            </div>

            <input id="leitorInvisivel" autoFocus type="text" value={leituraFisica} onChange={(e) => setLeituraFisica(e.target.value)} onKeyDown={handleKeyDownLeitor} onBlur={(e) => { if (e.relatedTarget && (e.relatedTarget.tagName === 'INPUT' || e.relatedTarget.tagName === 'TEXTAREA')) return; e.target.focus(); }} style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
            
            <section className="card-glass">
              <h2 style={{ color: theme.verdeIF, marginBottom: '20px', fontWeight: 800 }}>Terminal de Controle</h2>
              <div style={{ padding: '20px', backgroundColor: '#F0F4F1', borderRadius: '8px', textAlign: 'center', borderLeft: `6px solid ${theme.verdeIF}`, fontWeight: 'bold', color: theme.verdeIF, marginBottom: '25px' }}>📟 Hardware Biométrico Ativo</div>
              <form onSubmit={handleLiberarManual} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#475569' }}>Contingência Manual</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="Número de Matrícula" value={matriculaManual} onChange={(e) => setMatriculaManual(e.target.value)} className="modern-input" />
                  <button type="submit" className="interactive-btn" style={{ backgroundColor: theme.verdeIF, color: 'white' }}>Liberar</button>
                </div>
              </form>
            </section>

            <section className="card-glass" style={{ borderTopColor: '#333', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!resultadoCatraca && (<div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0' }}><span style={{ fontSize: '74px', display: 'block', marginBottom: '15px' }}>☝️</span><h3 style={{fontWeight: 600}}>Aguardando leitura digital...</h3></div>)}
              
              {resultadoCatraca?.status === 'liberado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '20px', backgroundColor: '#ECFDF5', borderRadius: '12px', border: `2px solid ${theme.verdeIF}` }}>
                    <div>
                      <span style={{ backgroundColor: theme.verdeIF, color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginRight: '10px' }}>ACESSO AUTORIZADO</span>
                      <h3 style={{ color: '#065F46', fontSize: '22px', fontWeight: 800, display: 'inline' }}>{resultadoCatraca?.aluno?.nome}</h3>
                    </div>
                  </div>
                  <form onSubmit={handleSalvarOcorrencia} style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ color: theme.vermelhoIF, fontWeight: 700 }}>🚨 Apontar Ocorrência Técnica</h4>
                    <textarea onFocus={pausarTimer} placeholder="Descreva o motivo (Ex: Sem uniforme, cota especial)..." value={textoOcorrencia} onChange={(e) => setTextoOcorrencia(e.target.value)} required rows={2} className="modern-input" />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="submit" disabled={gravandoOcorrencia} className="interactive-btn" style={{ backgroundColor: theme.vermelhoIF, color: 'white', flex: 2 }}>{gravandoOcorrencia ? <div className="spinner"></div> : 'Gravar Advertência'}</button>
                      <button type="button" onClick={fecharResultado} className="interactive-btn" style={{ backgroundColor: '#E2E8F0', color: '#475569', flex: 1 }}>Avançar</button>
                    </div>
                  </form>
                </div>
              )}
              {resultadoCatraca?.status === 'ja_almocou' && (<div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#FFF7ED', borderRadius: '12px', border: '2px solid #F57C00' }} className="animate-fade"><span style={{ fontSize: '60px', display: 'block', marginBottom: '10px' }}>🍽️</span><h3 style={{ color: '#C2410C', fontWeight: 800 }}>VOUCHER JÁ UTILIZADO</h3><p style={{color: '#9A3412', margin: '8px 0 20px 0'}}>O estudante <strong>{resultadoCatraca?.aluno?.nome}</strong> já consumiu sua cota diária.</p><button onClick={fecharResultado} className="interactive-btn" style={{ backgroundColor: '#F57C00', color: 'white' }}>Liberar Próximo</button></div>)}
              {resultadoCatraca?.status === 'negado' && (<div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '2px solid #CD191E' }} className="animate-fade"><span style={{ fontSize: '60px', display: 'block', marginBottom: '10px' }}>❌</span><h3 style={{ color: '#991B1B', fontWeight: 800 }}>ESTUDANTE INEXISTENTE</h3><p style={{color: '#7F1D1D', margin: '8px 0 20px 0'}}>Dados biométricos ou matrícula inválidos.</p><button onClick={fecharResultado} className="interactive-btn" style={{ backgroundColor: '#CD191E', color: 'white' }}>Limpar Terminal</button></div>)}
            </section>
          </div>
        )}

        {/* VISÕES INSTITUCIONAIS */}
        {['admin', 'fiscal', 'gestor'].includes(userRole) && (
          <div className="animate-fade">
            <nav style={{ display: 'flex', gap: '12px', marginBottom: '35px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '10px', backdropFilter: 'blur(8px)', width: 'fit-content' }}>
              {['admin', 'gestor'].includes(userRole) && (<button onClick={() => setActiveTab('alunos')} className={`nav-tab ${activeTab === 'alunos' ? 'active' : ''}`}>🎓 Gestão de Alunos</button>)}
              {['admin', 'fiscal'].includes(userRole) && (<button onClick={() => setActiveTab('configuracoes')} className={`nav-tab ${activeTab === 'configuracoes' ? 'active' : ''}`}>⚙️ Configurações do Sistema</button>)}
              {['admin', 'fiscal', 'gestor'].includes(userRole) && (<button onClick={() => setActiveTab('ocorrencias')} className={`nav-tab ${activeTab === 'ocorrencias' ? 'active' : ''}`}>🚨 Registro de Ocorrências</button>)}
              {['admin', 'fiscal', 'gestor'].includes(userRole) && (<button onClick={() => { setActiveTab('relatorios'); fetchRelatorioDiario(); }} className={`nav-tab ${activeTab === 'relatorios' ? 'active' : ''}`}>📊 Relatórios de Acesso</button>)}
              {userRole === 'fiscal' && (<button onClick={() => setActiveTab('validacao')} className={`nav-tab ${activeTab === 'validacao' ? 'active' : ''}`}>✅ Validar Período</button>)}
            </nav>

            {/* ABA: GESTÃO DE ALUNOS */}
            {activeTab === 'alunos' && ['admin', 'gestor'].includes(userRole) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                <section className="card-glass" style={{ borderTopColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF }}>
                  <h3 style={{ color: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, marginBottom: '20px', fontWeight: 800 }}>
                    {editingStudentId ? '✏️ Atualizar Registro' : 'Cadastrar Novo Aluno'}
                  </h3>
                  <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <input placeholder="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} required className="modern-input"/>
                    <input placeholder="Número de Matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} required className="modern-input"/>
                    <input placeholder="Curso Acadêmico" value={curso} onChange={e => setCurso(e.target.value)} required className="modern-input"/>
                    <input placeholder="Turma/Período" value={turma} onChange={e => setTurma(e.target.value)} required className="modern-input"/>
                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{editingStudentId ? "Substituir foto biométrica (Opcional)" : "Foto de Identificação Escolar"}</label>
                    <input type="file" onChange={e => setFoto(e.target.files[0])} required={!editingStudentId} className="modern-input" style={{ padding: '8px' }} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" className="interactive-btn" style={{ backgroundColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, color: 'white', flex: 1 }}>{editingStudentId ? 'Salvar Alterações' : 'Concluir Cadastro'}</button>
                      {editingStudentId && (<button type="button" onClick={handleCancelEdit} className="interactive-btn" style={{ backgroundColor: '#E2E8F0', color: '#475569' }}>Cancelar</button>)}
                    </div>
                  </form>
                </section>

                <section className="card-glass" style={{ borderTopColor: '#007bff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ fontWeight: 800, color: '#1E293B' }}>Base de Estudantes IFB</h3><button onClick={fetchStudents} className="interactive-btn" style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '6px 14px', fontSize: '13px' }}>🔄 Atualizar Lista</button></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(students || []).map(s => (
                      <div key={s?.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--borda)', borderRadius: '12px', background: '#fff', position: 'relative' }}>
                        <img src={`${API_URL}${s?.foto_url}`} alt="Estudante" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#1E293B', fontSize: '15px', display: 'block' }}>{s?.nome}</strong>
                          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>Matrícula: {s?.matricula}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>{s?.curso} | Turma {s?.turma}</div>
                        </div>
                        <button onClick={() => handleEditClick(s)} title="Editar Ficha" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer', borderRadius: '8px', padding: '8px' }}>✏️</button>
                      </div>
                    ))}
                    {(students || []).length === 0 && <div style={{ color: '#64748B', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>Nenhum estudante localizado na base local.</div>}
                  </div>
                </section>
              </div>
            )}

            {/* ABA: CONFIGURAÇÕES */}
            {activeTab === 'configuracoes' && ['admin', 'fiscal'].includes(userRole) && (
              <div className="card-glass" style={{ borderTopColor: '#333' }}>
                <h3 style={{ color: '#333', marginBottom: '10px', fontWeight: 800 }}>⚙️ Parâmetros Técnicos do Sistema</h3>
                <p style={{ color: '#64748B', marginBottom: '25px' }}>Definições para auditoria contratual, teto financeiro e janelas de funcionamento.</p>
                <form onSubmit={handleSalvarConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>Custo por Refeição (R$)</label>
                    <input type="number" step="0.01" value={sysConfig.valor_refeicao} onChange={e => setSysConfig({...sysConfig, valor_refeicao: parseFloat(e.target.value)})} className="modern-input" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>Abertura da Janela</label>
                    <input type="time" value={sysConfig.horario_inicio} onChange={e => setSysConfig({...sysConfig, horario_inicio: e.target.value})} className="modern-input" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>Fechamento da Janela</label>
                    <input type="time" value={sysConfig.horario_fim} onChange={e => setSysConfig({...sysConfig, horario_fim: e.target.value})} className="modern-input" required />
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <button type="submit" className="interactive-btn" style={{ backgroundColor: '#333', color: 'white' }}>Aplicar Novas Diretrizes</button>
                  </div>
                </form>
              </div>
            )}

            {/* ABA: OCORRÊNCIAS */}
            {activeTab === 'ocorrencias' && (
              <div className="card-glass" style={{ borderTopColor: theme.vermelhoIF }}>
                <h3 style={{ color: theme.vermelhoIF, marginBottom: '20px', fontWeight: 800 }}>🚨 Livro de Ocorrências Administrativas</h3>
                <div className="table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Data e Horário</th>
                        <th>Estudante</th>
                        <th>Relato da Ocorrência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocorrencias.map((o) => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600, color: '#64748B' }}>{o.data_hora}</td>
                          <td><strong style={{color: '#1E293B'}}>{o.nome}</strong><br/><span style={{fontSize: '12px', color: '#94A3B8'}}>Matrícula: {o.matricula}</span></td>
                          <td style={{ color: theme.vermelhoIF, fontWeight: 500 }}>{o.descricao}</td>
                        </tr>
                      ))}
                      {ocorrencias.length === 0 && (<tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Nenhum incidente pontuado no período.</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: RELATÓRIOS E EXPORTAÇÃO */}
            {activeTab === 'relatorios' && (
              <div className="card-glass">
                <h3 style={{ color: userRole === 'fiscal' ? '#1976D2' : theme.verdeIF, marginBottom: '8px', fontWeight: 800 }}>📊 Central de Exportação e Consolidação</h3>
                <p style={{ color: '#64748B', marginBottom: '30px' }}>Gere relatórios retroativos assinados digitalmente para envio à coordenação financeira.</p>
                
                <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', borderLeft: `6px solid ${userRole === 'fiscal' ? '#1976D2' : theme.verdeIF}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '20px', margin: 0, padding: 0, alignItems: 'center', border: 'none', background: 'transparent' }}>
                    <span style={{fontWeight: 700, color: '#475569'}}>Escopo Legal:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" checked={reportType === 'diario'} onChange={() => handleReportTypeChange('diario')} /> Diário</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" checked={reportType === 'mensal'} onChange={() => handleReportTypeChange('mensal')} /> Regular Mensal</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" checked={reportType === 'estudante'} onChange={() => handleReportTypeChange('estudante')} /> Por Aluno</label>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{fontWeight: 700, color: '#475569'}}>Parâmetro de Filtro:</span>
                    {reportType === 'diario' && <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="modern-input" style={{ width: '220px' }} />}
                    {reportType === 'mensal' && <input type="month" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="modern-input" style={{ width: '220px' }} />}
                    {reportType === 'estudante' && <input type="text" placeholder="Insira a matrícula" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="modern-input" style={{ width: '260px' }} />}

                    <button onClick={() => baixarRelatorio('pdf')} className="interactive-btn" style={{ backgroundColor: theme.vermelhoIF, color: 'white' }}>📄 Compilar PDF Oficial</button>
                    <button onClick={() => baixarRelatorio('csv')} className="interactive-btn" style={{ backgroundColor: theme.verdeIF, color: 'white' }}>📥 Exportar Planilha (CSV)</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', margin: '35px 0 25px 0' }}>
                   <div style={{ padding: '20px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: `1px solid #DCFCE7`, flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, letterSpacing: '0.5px' }}>REFEIÇÕES NO ESCOPO</div>
                      <div style={{ fontSize: '36px', color: theme.verdeIF, fontWeight: 900, marginTop: '4px' }}>{(relatorioDiario || []).length}</div>
                   </div>
                   <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: `1px solid #E2E8F0`, flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#475569', fontWeight: 700, letterSpacing: '0.5px' }}>AUTENTICAÇÃO BIOMÉTRICA</div>
                      <div style={{ fontSize: '36px', color: '#1E293B', fontWeight: 900, marginTop: '4px' }}>{(relatorioDiario || []).filter(r => r.metodo === 'biometria').length}</div>
                   </div>
                   <div style={{ padding: '20px', backgroundColor: '#FFF7ED', borderRadius: '12px', border: `1px solid #FFEDD5`, flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#9A3412', fontWeight: 700, letterSpacing: '0.5px' }}>LIBERAÇÕES MANUAIS</div>
                      <div style={{ fontSize: '36px', color: '#F57C00', fontWeight: 900, marginTop: '4px' }}>{(relatorioDiario || []).filter(r => r.metodo === 'manual').length}</div>
                   </div>
                </div>

                <h4 style={{ marginBottom: '15px', color: '#475569', fontWeight: 700 }}>📄 Diário de Bordo Auditável</h4>
                <div className="table-container" style={{maxHeight: '350px', overflowY: 'auto'}}>
                  <table className="modern-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th>Horário</th>
                        <th>Nome do Aluno</th>
                        <th>Matrícula</th>
                        <th>Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(relatorioDiario || []).map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600, color: '#64748B' }}>{log.hora}</td>
                          <td style={{ fontWeight: 700, color: '#1E293B' }}>{log.nome}</td>
                          <td style={{ color: '#475569' }}>{log.matricula}</td>
                          <td>
                            {log.metodo === 'biometria' ? (
                              <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>🟩 BIOMETRIA</span>
                            ) : (
                              <span style={{ backgroundColor: '#FFEDD5', color: '#9A3412', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>🟧 MANUAL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(relatorioDiario || []).length === 0 && (<tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Nenhum cota computada para este filtro.</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: VALIDAÇÃO COM PROTOCOLO OFICIAL */}
            {activeTab === 'validacao' && userRole === 'fiscal' && (
              <div className="card-glass" style={{ borderTopColor: '#1976D2' }}>
                <h3 style={{ color: '#1976D2', marginBottom: '10px', fontWeight: 800 }}>✅ Homologação e Fechamento do Período</h3>
                
                {!protocoloGerado ? (
                  <div style={{ border: '1px solid var(--borda)', borderRadius: '12px', padding: '30px', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--borda)', paddingBottom: '15px', marginBottom: '25px' }}>
                      <h4 style={{ margin: 0, fontSize: '18px', color: '#1E293B' }}>Cálculo de Subsídio Mensal</h4>
                      <span style={{ backgroundColor: '#FFEDD5', color: '#C2410C', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px' }}>Aguardando Assinatura</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
                      <div style={{ padding: '24px', backgroundColor: 'white', border: '1px solid var(--borda)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Total de Refeições no Mês</div>
                          <div style={{ fontSize: '36px', fontWeight: 900, color: '#1E293B', marginTop: '6px' }}>{totalRefeicoes}</div>
                      </div>
                      <div style={{ padding: '24px', backgroundColor: 'white', border: '1px solid var(--borda)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Repasse Financeiro Bruto Autorizado</div>
                          <div style={{ fontSize: '36px', fontWeight: 900, color: '#C2410C', marginTop: '6px' }}>R$ {((Number(totalRefeicoes) || 0) * (sysConfig.valor_refeicao || 6.50)).toFixed(2).replace('.', ',')}</div>
                      </div>
                    </div>
                    <button onClick={handleFecharMes} className="interactive-btn" style={{ width: '100%', padding: '18px', backgroundColor: '#1976D2', color: 'white', fontSize: '16px' }}>
                      ⚙️ EMITIR PROTOCOLO CRIPTOGRAFADO E AUTORIZAR REPASSE
                    </button>
                  </div>
                ) : (
                  <div style={{ border: `2px dashed ${theme.verdeIF}`, borderRadius: '14px', padding: '40px', backgroundColor: '#F0FDF4', textAlign: 'center' }} className="animate-fade">
                    <h2 style={{ color: '#166534', margin: '0 0 8px 0', fontWeight: 900 }}>MÊS HOMOLOGADO COM SUCESSO</h2>
                    <p style={{ color: '#15803D', marginBottom: '25px', fontWeight: 500 }}>A ordem de repasse foi transmitida e gravada na tabela de auditoria.</p>
                    <div style={{ display: 'inline-block', backgroundColor: 'white', border: `2px solid ${theme.verdeIF}`, padding: '20px 40px', borderRadius: '10px', boxShadow: theme.sombra }}>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 700, letterSpacing: '1px' }}>CHAVE DE PROTOCOLO DE AUDITORIA</span>
                      <strong style={{ fontSize: '24px', letterSpacing: '2px', color: '#1E293B', fontFamily: 'monospace' }}>{protocoloGerado}</strong>
                    </div>
                  </div>
                )}

                <h4 style={{ marginTop: '45px', marginBottom: '15px', color: '#475569', fontWeight: 700 }}>Histórico de Fechamentos Homologados</h4>
                <div className="table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Data Emissão</th>
                        <th>Período Competência</th>
                        <th>Volume Refeições</th>
                        <th>Montante Líquido</th>
                        <th>Chave do Protocolo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoValidacao.map(v => (
                        <tr key={v.protocolo}>
                          <td>{v.data}</td>
                          <td style={{ fontWeight: 700, color: '#1E293B' }}>{v.mes}</td>
                          <td>{v.total}</td>
                          <td style={{ color: '#C2410C', fontWeight: 700 }}>R$ {v.valor.toFixed(2).replace('.',',')}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1976D2' }}>{v.protocolo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;