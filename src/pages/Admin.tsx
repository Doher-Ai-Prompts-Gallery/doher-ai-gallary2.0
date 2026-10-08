import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, retryFirebaseOperation } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { Category, Prompt } from '../types';
import { 
  LayoutDashboard, 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  Link as LinkIcon,
  Check,
  X,
  Eye,
  EyeOff,
  LogOut,
  FolderOpen,
  WifiOff,
  RefreshCcw
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { setLoading, setRetryAction } = useApp();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin Panel State
  const [view, setView] = useState<'dashboard' | 'prompts' | 'categories'>('dashboard');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form State
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({
    title: '',
    prompt: '',
    categoryId: '',
    imageUrl: '',
    published: true,
    useCustomViews: false,
    customViews: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const adminDoc = await getDoc(doc(db, 'admins', u.uid));
        if (adminDoc.exists() && adminDoc.data()?.role === 'admin') {
          setIsAdmin(true);
          fetchAdminData();
        } else {
          setAuthError('Access denied. You are not an admin.');
          await signOut(auth);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const [adminError, setAdminError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setAdminError(null);
    try {
      const [catSnap, promptSnap] = await Promise.all([
        retryFirebaseOperation(() => getDocs(collection(db, 'categories'))),
        retryFirebaseOperation(() => getDocs(collection(db, 'prompts')))
      ]);
      
      const catList = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      catList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCategories(catList);

      const promptList = promptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt));
      promptList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setPrompts(promptList);
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      setAdminError(error?.message?.includes('offline') ? 'You are currently offline. Admin operations are disabled.' : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        setAuthError('Connection error. Please check your internet and try again.');
      } else if (error.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. Please try again.');
      } else {
        setAuthError('Login failed. Please verify your credentials.');
      }
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = promptForm.imageUrl;
      let storagePath = '';

      if (selectedFile) {
        const fileRef = ref(storage, `prompts/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
        storagePath = uploadResult.ref.fullPath;
      }

      const category = categories.find(c => c.id === promptForm.categoryId);
      const promptData = {
        ...promptForm,
        categoryName: category?.name || '',
        imageUrl: finalImageUrl,
        storagePath: storagePath || (isEditingPrompt ? prompts.find(p => p.id === editingPromptId)?.storagePath : ''),
        updatedAt: serverTimestamp()
      };

      if (isEditingPrompt && editingPromptId) {
        await retryFirebaseOperation(() => updateDoc(doc(db, 'prompts', editingPromptId), promptData));
        alert("Prompt updated successfully.");
      } else {
        await retryFirebaseOperation(() => addDoc(collection(db, 'prompts'), {
          ...promptData,
          createdAt: serverTimestamp(),
          views: 0
        }));
        alert("Prompt created successfully.");
      }

      setIsEditingPrompt(false);
      setEditingPromptId(null);
      setPromptForm({ 
        title: '', 
        prompt: '', 
        categoryId: '', 
        imageUrl: '', 
        published: true,
        useCustomViews: false,
        customViews: ''
      });
      setSelectedFile(null);
      fetchAdminData();
    } catch (error: any) {
      console.error("Error saving prompt:", error);
      alert(`Failed to save prompt: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditingCategory && editingCategoryId) {
        // Update category name
        await retryFirebaseOperation(() => updateDoc(doc(db, 'categories', editingCategoryId), { name: categoryName }));
        
        // Update categoryName in all related prompts
        const relatedPrompts = prompts.filter(p => p.categoryId === editingCategoryId);
        if (relatedPrompts.length > 0) {
          const updatePromises = relatedPrompts.map(p => 
            updateDoc(doc(db, 'prompts', p.id), { categoryName: categoryName })
          );
          await Promise.all(updatePromises);
        }

        alert("Category updated successfully.");
      } else {
        // Check for duplicates
        const exists = categories.some(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (exists) {
          alert("A category with this name already exists.");
          setLoading(false);
          return;
        }
        await retryFirebaseOperation(() => addDoc(collection(db, 'categories'), { 
          name: categoryName,
          createdAt: serverTimestamp()
        }));
        alert("Category created successfully.");
      }
      setIsEditingCategory(false);
      setCategoryName('');
      fetchAdminData();
    } catch (error: any) {
      console.error("Error saving category:", error);
      alert(`Failed to save category: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrompt = async (prompt: Prompt) => {
    if (!prompt.id) {
      alert("Invalid prompt ID.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this prompt?");
    if (!confirmed) return;

    setLoading(true);
    try {
      // 1. Delete from Storage if exists
      if (prompt.storagePath) {
        const fileRef = ref(storage, prompt.storagePath);
        await deleteObject(fileRef).catch(e => {
          console.warn("Storage deletion failed (might already be gone):", e);
        });
      }

      // 2. Delete from Firestore
      await retryFirebaseOperation(() => deleteDoc(doc(db, 'prompts', prompt.id)));

      // 3. Update local state immediately
      setPrompts(prev => prev.filter(p => p.id !== prompt.id));
      
      alert("Prompt deleted successfully.");
      
      // Optional: Full refresh to be safe
      fetchAdminData();
    } catch (error: any) {
      console.error("Error deleting prompt:", error);
      const msg = error.code === 'permission-denied' 
        ? "You do not have permission to delete this item." 
        : `Failed to delete prompt: ${error.message || 'Unknown error'}`;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!categoryId) {
      alert("Invalid category ID.");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if category is used by any prompt
      const q = query(
        collection(db, "prompts"),
        where("categoryId", "==", categoryId)
      );
      
      const snapshot = await retryFirebaseOperation(() => getDocs(q));
      
      if (snapshot.size > 0) {
        alert("This category is currently used by existing prompts. Please reassign or remove those prompts before deleting the category.");
        setLoading(false);
        return;
      }

      // 2. Double confirmation
      const confirmed = window.confirm("Are you sure you want to delete this category?");
      if (!confirmed) {
        setLoading(false);
        return;
      }

      // 3. Execute delete
      await retryFirebaseOperation(() => deleteDoc(doc(db, 'categories', categoryId)));
      
      // 4. Update state
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      
      alert("Category deleted successfully.");
      fetchAdminData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      const msg = error.code === 'permission-denied' 
        ? "You do not have permission to delete this category." 
        : `Failed to delete category: ${error.message || 'Unknown error'}`;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="/src/assets/images/doher_logo_1790309001039.jpg" alt="Logo" className="w-20 h-20 mb-4" />
            <h2 className="text-2xl font-black gold-text">ADMIN LOGIN</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field" 
                required 
              />
            </div>
            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
            <button type="submit" className="gold-button w-full py-3">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 space-y-2">
          <div className="glass-card p-6 mb-6 text-center">
             <img src="/src/assets/images/doher_logo_1790309001039.jpg" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
             <p className="text-xs font-bold text-brand-gold">ADMINISTRATION</p>
          </div>
          
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${view === 'dashboard' ? 'bg-brand-gold text-black' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setView('prompts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${view === 'prompts' ? 'bg-brand-gold text-black' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <ImageIcon className="w-5 h-5" />
            Prompts
          </button>
          <button 
            onClick={() => setView('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${view === 'categories' ? 'bg-brand-gold text-black' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <FolderOpen className="w-5 h-5" />
            Categories
          </button>
          <div className="pt-8">
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow">
          {adminError && (
            <div className="glass-card p-6 mb-8 border-red-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="text-red-500 w-5 h-5" />
                <p className="text-gray-300 font-medium">{adminError}</p>
              </div>
              <button 
                onClick={fetchAdminData}
                className="outline-button py-2 px-6 text-sm flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry Loading
              </button>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="space-y-8 max-w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="glass-card p-6 md:p-8 border-brand-gold/10">
                  <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Total Prompts</p>
                  <p className="text-3xl md:text-4xl font-black text-white">{prompts.length}</p>
                </div>
                <div className="glass-card p-6 md:p-8 border-brand-gold/10">
                  <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Published</p>
                  <p className="text-3xl md:text-4xl font-black text-brand-gold">{prompts.filter(p => p.published).length}</p>
                </div>
                <div className="glass-card p-6 md:p-8 border-brand-gold/10">
                  <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Categories</p>
                  <p className="text-3xl md:text-4xl font-black text-white">{categories.length}</p>
                </div>
              </div>

              <div className="glass-card p-4 md:p-8">
                <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {prompts.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-brand-panel overflow-hidden shrink-0">
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{p.title}</p>
                          <p className="text-xs text-gray-500 truncate">{p.categoryName}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 ${p.published ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {p.published ? 'PUBLISHED' : 'HIDDEN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'prompts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Manage Prompts</h2>
                <button 
                  onClick={() => {
                    setIsEditingPrompt(false);
                    setEditingPromptId(null);
                    setPromptForm({ 
                      title: '', 
                      prompt: '', 
                      categoryId: '', 
                      imageUrl: '', 
                      published: true,
                      useCustomViews: false,
                      customViews: ''
                    });
                    setIsEditingPrompt(true);
                  }}
                  className="gold-button flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add New Prompt
                </button>
              </div>

              {isEditingPrompt && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 md:p-8 border-brand-gold/30">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-brand-gold">{editingPromptId ? 'Edit Prompt' : 'New Prompt'}</h3>
                    <button onClick={() => setIsEditingPrompt(false)}><X className="text-gray-500 hover:text-white" /></button>
                  </div>
                  <form onSubmit={handlePromptSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                          <input 
                            type="text" 
                            value={promptForm.title}
                            onChange={(e) => setPromptForm({...promptForm, title: e.target.value})}
                            className="input-field" 
                            required 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                          <select 
                            value={promptForm.categoryId}
                            onChange={(e) => setPromptForm({...promptForm, categoryId: e.target.value})}
                            className="input-field"
                            required
                          >
                            <option value="">Select a category</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prompt Text</label>
                          <textarea 
                            value={promptForm.prompt}
                            onChange={(e) => setPromptForm({...promptForm, prompt: e.target.value})}
                            className="input-field min-h-[150px] resize-none" 
                            required 
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL (Optional)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={promptForm.imageUrl}
                              onChange={(e) => setPromptForm({...promptForm, imageUrl: e.target.value})}
                              className="input-field" 
                              placeholder="https://..."
                            />
                            <div className="flex items-center px-3 bg-brand-panel border border-white/10 rounded-lg text-gray-500">
                              <LinkIcon className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-4 md:p-8 text-center hover:border-brand-gold/30 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                          <input 
                            id="file-upload"
                            type="file" 
                            className="hidden" 
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            accept="image/*"
                          />
                          {selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                              <Check className="text-green-500 w-8 h-8" />
                              <p className="text-sm font-bold text-white break-all">{selectedFile.name}</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="text-gray-600 w-8 h-8" />
                              <p className="text-sm font-bold text-gray-400">Click to upload image</p>
                              <p className="text-[10px] text-gray-600 uppercase font-black">Max 5MB • PNG, JPG</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-3">
                             <input 
                               type="checkbox" 
                               id="published"
                               checked={promptForm.published}
                               onChange={(e) => setPromptForm({...promptForm, published: e.target.checked})}
                               className="w-5 h-5 accent-brand-gold shrink-0"
                             />
                             <label htmlFor="published" className="text-sm font-bold text-white cursor-pointer select-none">Published and visible</label>
                          </div>
                          
                          <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                id="useCustomViews"
                                checked={promptForm.useCustomViews}
                                onChange={(e) => setPromptForm({...promptForm, useCustomViews: e.target.checked})}
                                className="w-5 h-5 accent-brand-gold shrink-0"
                              />
                              <label htmlFor="useCustomViews" className="text-sm font-bold text-white cursor-pointer select-none">Enable custom views</label>
                            </div>
                            
                            {promptForm.useCustomViews && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                                <label className="block text-[10px] font-bold text-brand-gold uppercase mb-1 ml-1">Custom Views (e.g., 5M, 1.5K)</label>
                                <input 
                                  type="text" 
                                  value={promptForm.customViews}
                                  onChange={(e) => setPromptForm({...promptForm, customViews: e.target.value})}
                                  placeholder="e.g., 1.5K, 5M, 100M"
                                  className="input-field py-1.5"
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                       <button type="button" onClick={() => setIsEditingPrompt(false)} className="outline-button border-gray-600 text-gray-400 py-2 order-2 sm:order-1">Cancel</button>
                       <button type="submit" className="gold-button px-10 py-2 order-1 sm:order-2">Save Prompt</button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="glass-card overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4">Title / Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prompts.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                           <div className="w-10 h-10 rounded overflow-hidden bg-brand-panel">
                             {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <p className="font-bold text-white text-sm truncate max-w-[200px]">{p.title}</p>
                           <p className="text-xs text-gray-500 truncate max-w-[200px]">{p.categoryName}</p>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             {p.published ? <Eye className="w-3 h-3 text-green-500" /> : <EyeOff className="w-3 h-3 text-yellow-500" />}
                             <span className={`text-[10px] font-black ${p.published ? 'text-green-500' : 'text-yellow-500'}`}>
                               {p.published ? 'PUBLISHED' : 'HIDDEN'}
                             </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => {
                                 setPromptForm({
                                   title: p.title,
                                   prompt: p.prompt,
                                   categoryId: p.categoryId,
                                   imageUrl: p.imageUrl || '',
                                   published: p.published,
                                   useCustomViews: p.useCustomViews || false,
                                   customViews: p.customViews || ''
                                 });
                                 setEditingPromptId(p.id);
                                 setIsEditingPrompt(true);
                               }}
                               className="p-2 hover:bg-brand-gold/10 text-gray-400 hover:text-brand-gold rounded transition-colors"
                             >
                               <Edit2 className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => handleDeletePrompt(p)}
                               className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded transition-colors"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Manage Categories</h2>
                <button 
                  onClick={() => {
                    setIsEditingCategory(false);
                    setEditingCategoryId(null);
                    setCategoryName('');
                    setIsEditingCategory(true);
                  }}
                  className="gold-button flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  New Category
                </button>
              </div>

              {isEditingCategory && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 border-brand-gold/30">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-brand-gold">{editingCategoryId ? 'Edit Category' : 'New Category'}</h3>
                    <button onClick={() => setIsEditingCategory(false)}><X className="text-gray-500 hover:text-white" /></button>
                  </div>
                  <form onSubmit={handleCategorySubmit} className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text" 
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Category Name..."
                      className="input-field"
                      required
                    />
                    <button type="submit" className="gold-button whitespace-nowrap py-3 sm:py-2.5">Save Category</button>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {categories.map(c => (
                  <div key={c.id} className="glass-card p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-brand-gold/30 transition-all gap-4">
                    <span className="font-bold text-white text-lg truncate w-full">{c.name}</span>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button 
                        onClick={() => {
                          setCategoryName(c.name);
                          setEditingCategoryId(c.id);
                          setIsEditingCategory(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-black rounded-lg transition-all text-xs font-bold"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(c.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

import { motion } from 'motion/react';
