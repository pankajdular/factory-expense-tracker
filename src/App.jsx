import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css' // This connects our beautiful new CSS!

function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('expenses') 
  
  // Expense States
  const [expenses, setExpenses] = useState([])
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [expCategory, setExpCategory] = useState('Labor')
  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')

  // Inventory States
  const [materials, setMaterials] = useState([])
  const [matName, setMatName] = useState('')
  const [matQty, setMatQty] = useState('')
  const [matCost, setMatCost] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) { fetchExpenses(); fetchMaterials() }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) { fetchExpenses(); fetchMaterials() }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }
  const handleAddExpense = async (e) => {
    e.preventDefault()
    await supabase.from('expenses').insert([{ date: expDate, category: expCategory, amount: parseFloat(expAmount), description: expDesc, user_id: session.user.id }])
    setExpAmount(''); setExpDesc(''); fetchExpenses()
  }

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false })
    if (data) setMaterials(data)
  }
  const handleAddMaterial = async (e) => {
    e.preventDefault()
    await supabase.from('materials').insert([{ name: matName, stock_qty: parseFloat(matQty), cost_per_unit: parseFloat(matCost) }])
    setMatName(''); setMatQty(''); setMatCost(''); fetchMaterials()
  }

  const handleLogout = async () => { await supabase.auth.signOut() }

  // --- LOGIN VIEW ---
  if (!session) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <div className="card">
             <h2 className="login-heading">Factory Portal</h2>
          <button className="btn btn-primary" onClick={async () => {
            const { error } = await supabase.auth.signInWithPassword({
              email: prompt('Enter Email'), password: prompt('Enter Password'),
            })
            if (error) alert(error.message)
          }}>
            Sign In
          </button>
        </div>
      </div>
    )
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Factory App</h1>
        <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
      </header>

      {/* TABS */}
      <div className="tabs">
        <button className={`tab-btn ${view === 'expenses' ? 'active' : ''}`} onClick={() => setView('expenses')}>
          💸 Daily Expenses
        </button>
        <button className={`tab-btn ${view === 'inventory' ? 'active' : ''}`} onClick={() => setView('inventory')}>
          📦 Inventory
        </button>
      </div>

      {/* EXPENSES VIEW */}
      {view === 'expenses' && (
        <>
          <div className="card">
            <h3>Add New Expense</h3>
            <form onSubmit={handleAddExpense} className="form-grid">
              <input type="date" className="input" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
              <select className="select" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                <option>Labor</option><option>Electricity</option><option>Raw Materials</option><option>Maintenance</option><option>Other</option>
              </select>
              <input type="number" className="input" placeholder="Amount ($)" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} step="0.01" required />
              <input type="text" className="input" placeholder="Description (Optional)" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
              <button type="submit" className="btn btn-primary">Save Expense</button>
            </form>
          </div>
          
          <div className="card">
            <h3>Recent History</h3>
            <ul className="list">
              {expenses.map((exp) => (
                <li key={exp.id} className="list-item">
                  <div className="list-item-info">
                    <strong>{exp.category}</strong>
                    <small>{exp.description || 'No description'} • {exp.date}</small>
                  </div>
                  <div className="list-item-value text-danger">
                    ${parseFloat(exp.amount).toFixed(2)}
                  </div>
                </li>
              ))}
              {expenses.length === 0 && <li className="empty-state">No expenses recorded yet.</li>}
            </ul>
          </div>
        </>
      )}

      {/* INVENTORY VIEW */}
      {view === 'inventory' && (
        <>
          <div className="card">
            <h3>Add Raw Material</h3>
            <form onSubmit={handleAddMaterial} className="form-grid">
              <input type="text" className="input" placeholder="Material Name (e.g. Steel)" value={matName} onChange={(e) => setMatName(e.target.value)} required />
              <input type="number" className="input" placeholder="Current Stock Quantity" value={matQty} onChange={(e) => setMatQty(e.target.value)} step="0.01" required />
              <input type="number" className="input" placeholder="Cost per Unit ($)" value={matCost} onChange={(e) => setMatCost(e.target.value)} step="0.01" required />
              <button type="submit" className="btn btn-success">Add to Inventory</button>
            </form>
          </div>
          
          <div className="card">
            <h3>Current Materials</h3>
            <ul className="list">
              {materials.map((mat) => (
                <li key={mat.id} className="list-item">
                  <div className="list-item-info">
                    <strong>{mat.name}</strong>
                    <small>Cost: ${parseFloat(mat.cost_per_unit).toFixed(2)} / unit</small>
                  </div>
                  <div className="list-item-value text-primary">
                    {parseFloat(mat.stock_qty).toFixed(2)}
                  </div>
                </li>
              ))}
              {materials.length === 0 && <li className="empty-state">No materials added yet.</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default App