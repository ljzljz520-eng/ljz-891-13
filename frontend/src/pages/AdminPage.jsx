import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Lock, User, Plus, Trash2, Search, Sliders, Users, Shield, Hash, Package, Network, CalendarCheck, CalendarClock, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';

// Format a Date as a value accepted by <input type="datetime-local">
const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const defaultStart = () => toLocalInputValue(new Date());
const defaultExpiration = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toLocalInputValue(d);
};

// Format backend datetime for table display
const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyLicenseForm = () => ({
  qq: '',
  owner_name: '',
  product_name: '',
  upline: '官方',
  start_date: defaultStart(),
  expiration_date: defaultExpiration(),
});

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Dashboard State
  const [licenses, setLicenses] = useState([]);
  const [filteredLicenses, setFilteredLicenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newLicense, setNewLicense] = useState(emptyLicenseForm);
  const [formErrors, setFormErrors] = useState({});

  // Modal State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState('license'); // 'license' or 'admin'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Admin Management State
  const [activeTab, setActiveTab] = useState('license'); // 'license' | 'admin'
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });

  useEffect(() => {
    if (token) {
        fetchLicenses();
        fetchAdmins();
    }
  }, [token]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredLicenses(licenses);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredLicenses(licenses.filter(l => 
        l.qq.includes(lower) || 
        l.owner_name.toLowerCase().includes(lower) ||
        l.product_name.toLowerCase().includes(lower)
      ));
    }
  }, [searchTerm, licenses]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('auth_token', res.data.token);
      setToken(res.data.token);
      toast.success('欢迎回来，管理员');
    } catch (err) {
      toast.error('登录失败: 用户名或密码错误');
    }
  };

  const fetchLicenses = async () => {
    try {
      const res = await axios.get('/api/license/list');
      setLicenses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Validate the license form before saving
  const validateLicense = () => {
    const errors = {};
    const f = newLicense;

    if (!f.qq.trim()) errors.qq = '请填写授权QQ';
    else if (!/^\d{5,12}$/.test(f.qq.trim())) errors.qq = '请输入正确的QQ号码（5-12位数字）';

    if (!f.owner_name.trim()) errors.owner_name = '请填写授权主人';
    if (!f.product_name.trim()) errors.product_name = '请填写所属产品';
    if (!f.upline.trim()) errors.upline = '请填写授权上级';

    if (!f.start_date) errors.start_date = '请选择开通时间';
    if (!f.expiration_date) errors.expiration_date = '请选择有效期';

    // 有效期不能早于开通时间
    if (f.start_date && f.expiration_date && new Date(f.expiration_date) < new Date(f.start_date)) {
      errors.expiration_date = '有效期不能早于开通时间';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateLicenseField = (field, value) => {
    setNewLicense((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'license') {
          if (!validateLicense()) {
            toast.error('请检查表单填写内容');
            return;
          }
          const payload = {
            ...newLicense,
            qq: newLicense.qq.trim(),
            owner_name: newLicense.owner_name.trim(),
            product_name: newLicense.product_name.trim(),
            upline: newLicense.upline.trim(),
          };
          await axios.post('/api/license/create', payload);
          toast.success('授权添加成功，前台已可立即查询');
          setNewLicense(emptyLicenseForm());
          setFormErrors({});
          fetchLicenses();
      } else {
          await axios.post('/api/auth/create', newAdmin);
          toast.success('管理员添加成功');
          setNewAdmin({ username: '', password: '' });
          fetchAdmins();
      }
    } catch (err) {
      toast.error('添加失败：' + (err.response?.data?.message || '网络错误'));
    }
  };

  const fetchAdmins = async () => {
      try {
          const res = await axios.get('/api/auth/list');
          setAdmins(res.data);
      } catch (err) {
          console.error(err);
      }
  };

  const handleCreateAdmin = async (e) => {
      // Merged into handleCreate logic above based on activeTab
  };

  const confirmDelete = (id, type = 'license') => {
    setDeleteId(id);
    setDeleteType(type);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      if (deleteType === 'license') {
          await axios.post('/api/license/delete', { id: deleteId });
          toast.success('已删除该授权');
          fetchLicenses();
      } else {
          await axios.post('/api/auth/delete', { id: deleteId });
          toast.success('已删除该管理员');
          fetchAdmins();
      }
    } catch(err) {
      toast.error('删除失败');
    }
  };

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md glass-card p-10 animate-fade-in-up">
           <div className="text-center mb-8">
             <div className="w-16 h-16 bg-sky-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-sky-400">
               <Lock size={32} />
             </div>
             <h2 className="text-2xl font-bold text-white">管理员登录</h2>
             <p className="text-white/40 mt-2 text-sm">请输入您的管理凭证以继续</p>
           </div>
           
           <form onSubmit={handleLogin} className="space-y-5">
             <div>
               <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">账号</label>
               <div className="relative group">
                 <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="glass-input w-full pl-10 h-11" placeholder="Administrator" />
                 <User className="absolute left-3 top-3.5 w-4 h-4 text-white/30 group-focus-within:text-sky-400 transition" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">密码</label>
               <div className="relative group">
                 <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="glass-input w-full pl-10 h-11" placeholder="••••••••" />
                 <Lock className="absolute left-3 top-3.5 w-4 h-4 text-white/30 group-focus-within:text-sky-400 transition" />
               </div>
             </div>
             <button type="submit" className="tech-button w-full mt-2 !py-3 !text-sm tracking-widest">登录</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-300">
            授权管理中心
          </h1>
          <p className="text-white/40 mt-1">System Administration Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
             <input 
                type="text" 
                placeholder="搜索QQ、主人或产品..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="glass-input pl-10 pr-4 py-2 w-64 text-sm"
             />
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
           </div>
           <button onClick={() => {localStorage.removeItem('auth_token'); setToken(null);}} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition border border-white/5 hover:border-red-500/30">
             退出登录
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Add Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                <div className="p-1.5 bg-sky-500/20 rounded-lg text-sky-400">
                  <Plus className="w-4 h-4"/>
                </div>
                {activeTab === 'license' ? '新增授权' : '新增管理员'}
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                 {activeTab === 'license' ? (
                     <>
                        {/* 授权对象 */}
                        <FormSection title="授权对象">
                          <FormField
                            label="授权QQ" required error={formErrors.qq}
                            icon={<Hash className="w-4 h-4" />}
                          >
                            <input
                              className={`glass-input w-full pl-9 h-10 ${formErrors.qq ? '!border-red-500/60 focus:!ring-red-500' : ''}`}
                              placeholder="请输入QQ号码"
                              inputMode="numeric"
                              value={newLicense.qq}
                              onChange={e => updateLicenseField('qq', e.target.value.replace(/\D/g, '').slice(0, 12))}
                            />
                          </FormField>
                          <FormField
                            label="授权主人" required error={formErrors.owner_name}
                            icon={<User className="w-4 h-4" />}
                          >
                            <input
                              className={`glass-input w-full pl-9 h-10 ${formErrors.owner_name ? '!border-red-500/60 focus:!ring-red-500' : ''}`}
                              placeholder="请输入主人名称"
                              value={newLicense.owner_name}
                              onChange={e => updateLicenseField('owner_name', e.target.value)}
                            />
                          </FormField>
                        </FormSection>

                        {/* 授权信息 */}
                        <FormSection title="授权信息">
                          <FormField
                            label="所属产品" required error={formErrors.product_name}
                            icon={<Package className="w-4 h-4" />}
                          >
                            <input
                              className={`glass-input w-full pl-9 h-10 ${formErrors.product_name ? '!border-red-500/60 focus:!ring-red-500' : ''}`}
                              placeholder="例如：超级授权系统VIP版"
                              value={newLicense.product_name}
                              onChange={e => updateLicenseField('product_name', e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label="授权上级" required error={formErrors.upline}
                            icon={<Network className="w-4 h-4" />}
                          >
                            <input
                              className={`glass-input w-full pl-9 h-10 ${formErrors.upline ? '!border-red-500/60 focus:!ring-red-500' : ''}`}
                              placeholder="例如：总代理"
                              value={newLicense.upline}
                              onChange={e => updateLicenseField('upline', e.target.value)}
                            />
                          </FormField>
                        </FormSection>

                        {/* 时间设置 */}
                        <FormSection title="时间设置">
                          <FormField
                            label="开通时间" required error={formErrors.start_date}
                            icon={<CalendarCheck className="w-4 h-4" />}
                          >
                            <input
                              type="datetime-local"
                              className={`glass-input w-full pl-9 h-10 [color-scheme:dark] ${formErrors.start_date ? '!border-red-500/60 focus:!ring-red-500' : ''}`}
                              value={newLicense.start_date}
                              onChange={e => updateLicenseField('start_date', e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label="有效期（到期时间）" required error={formErrors.expiration_date}
                            icon={<CalendarClock className="w-4 h-4" />}
                            hint="有效期不能早于开通时间"
                          >
                            <input
                              type="datetime-local"
                              className={`glass-input w-full pl-9 h-10 [color-scheme:dark] ${formErrors.expiration_date ? '!border-red-500/60 focus:!ring-red-500' : ''}`}
                              value={newLicense.expiration_date}
                              onChange={e => updateLicenseField('expiration_date', e.target.value)}
                            />
                          </FormField>
                        </FormSection>
                     </>
                 ) : (
                     <>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">用户名</label>
                            <input required className="glass-input w-full" placeholder="输入新管理员账号" value={newAdmin.username} onChange={e=>setNewAdmin({...newAdmin, username:e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">密码</label>
                            <input required type="text" className="glass-input w-full" placeholder="设置初始密码" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin, password:e.target.value})} />
                        </div>
                     </>
                 )}
                 <div className="pt-2">
                    <button type="submit" className="tech-button w-full flex justify-center items-center gap-2">
                      <Plus size={16} /> {activeTab === 'license' ? '立即授权' : '添加管理员'}
                    </button>
                 </div>
              </form>
          </div>
        </div>

        {/* Main: Details List */}
        <div className="lg:col-span-3">
           <div className="glass-card overflow-hidden flex flex-col min-h-[600px]">
             <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                 <h3 className="font-bold flex items-center gap-2">
                    {activeTab === 'license' ? <Sliders size={18} className="text-sky-400"/> : <Shield size={18} className="text-sky-400"/>}
                    {activeTab === 'license' ? '授权列表' : '管理员列表'}
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">
                        {activeTab === 'license' ? filteredLicenses.length : admins.length}
                    </span>
                 </h3>
                 <div className="flex space-x-2">
                    <button 
                        onClick={() => setActiveTab('license')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'license' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'}`}
                    >
                        <Users className="inline-block w-4 h-4 mr-2" /> 授权管理
                    </button>
                    <button 
                        onClick={() => setActiveTab('admin')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'admin' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'}`}
                    >
                        <Shield className="inline-block w-4 h-4 mr-2" /> 管理员管理
                    </button>
                 </div>
             </div>
                          <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-white/40 uppercase tracking-wider bg-black/20">
                      {activeTab === 'license' ? (
                          <>
                            <th className="p-4">ID</th>
                            <th className="p-4">授权QQ</th>
                            <th className="p-4">授权信息</th>
                            <th className="p-4">产品/上级</th>
                            <th className="p-4">状态/时间</th>
                          </>
                      ) : (
                          <>
                            <th className="p-4">ID</th>
                            <th className="p-4">管理员账号</th>
                            <th className="p-4">创建时间/状态</th>
                            <th className="p-4"></th>
                            <th className="p-4"></th>
                          </>
                      )}
                      
                      <th className="p-4 text-right">管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(activeTab === 'license' ? filteredLicenses : admins).length === 0 ? (
                       <tr>
                         <td colSpan="6" className="p-12 text-center text-white/30">
                            暂无数据
                         </td>
                       </tr>
                    ) : (
                      (activeTab === 'license' ? filteredLicenses : admins).map(item => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition group">
                          {activeTab === 'license' ? (
                              <>
                                <td className="p-4 text-white/30 font-mono text-xs">#{item.id}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
                                        {item.qq.slice(0, 2)}
                                    </div>
                                    <span className="text-sky-300 font-medium font-mono">{item.qq}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm font-medium">{item.owner_name}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm">{item.product_name}</div>
                                    <div className="text-xs text-white/40 mt-0.5">{item.upline}</div>
                                </td>
                                <td className="p-4">
                                    {new Date(item.expiration_date) >= new Date() ? (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 mb-1">
                                    正常
                                    </div>
                                    ) : (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 mb-1">
                                    已过期
                                    </div>
                                    )}
                                    <div className="text-xs text-white/40 font-mono leading-relaxed">
                                      <div>开通：{formatDateTime(item.start_date)}</div>
                                      <div>到期：{formatDateTime(item.expiration_date)}</div>
                                    </div>
                                </td>
                              </>
                          ) : (
                              <>
                                <td className="p-4 text-white/30 font-mono text-xs">#{item.id}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                                            <User size={14} />
                                        </div>
                                        <span className="text-white font-medium">{item.username}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-xs text-white/40">管理员</td>
                                <td className="p-4"></td>
                                <td className="p-4"></td>
                              </>
                          )}
                          
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => confirmDelete(item.id, activeTab)} 
                              className="text-white/20 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination or Footer (Simple) */}
              <div className="p-4 border-t border-white/5 text-xs text-white/30 text-center">
                End of List
              </div>
            </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title={deleteType === 'license' ? "确认删除授权" : "确认删除管理员"}
        type="danger"
        content={deleteType === 'license' 
            ? "您确定要删除此授权吗？删除后该用户将无法查询到授权信息，此操作不可恢复。" 
            : "您确定要删除此管理员吗？删除后该账号将无法登录后台。"
        }
      />
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[11px] font-semibold uppercase tracking-widest text-sky-400/80 flex items-center gap-2">
        <span className="w-4 h-px bg-sky-400/40"></span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FormField({ label, required, error, hint, icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between text-xs font-medium text-white/60">
        <span>
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </span>
        {hint && !error && <span className="text-[10px] text-white/30">{hint}</span>}
      </label>
      <div className="relative group/field">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/field:text-sky-400 transition pointer-events-none">
            {icon}
          </span>
        )}
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
