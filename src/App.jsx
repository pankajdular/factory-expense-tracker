import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('expenses')
  
  // Expense States
  const [expenses, setExpenses] = useState([])
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [expCategory, setExpCategory] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [showAllExpenses, setShowAllExpenses] = useState(false)

  // Inventory States
  const [materials, setMaterials] = useState([])
  const [matName, setMatName] = useState('')
  const [matQty, setMatQty] = useState('')
  const [matCost, setMatCost] = useState('')

  // Budget States
  const [totalBudget, setTotalBudget] = useState(0)
  const [budgetInput, setBudgetInput] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) { 
        fetchExpenses()
        fetchMaterials()
        fetchBudget()
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) { 
        fetchExpenses()
        fetchMaterials()
        fetchBudget()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // --- EXPENSE FUNCTIONS ---
  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    await supabase.from('expenses').insert([{ 
      date: expDate, 
      category: expCategory, 
      amount: parseFloat(expAmount), 
      description: expDesc, 
      user_id: session.user.id 
    }])
    setExpAmount('')
    setExpDesc('')
    setExpCategory('')
    fetchExpenses()
  }

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
      await supabase.from('expenses').delete().eq('id', id)
      fetchExpenses()
    }
  }

  // --- BUDGET FUNCTIONS ---
  const fetchBudget = async () => {
    const { data } = await supabase.from('budget').select('*').eq('user_id', session.user.id).single()
    if (data) {
      setTotalBudget(data.total_budget)
      setBudgetInput(data.total_budget.toString())
    }
  }

  const handleUpdateBudget = async (e) => {
    e.preventDefault()
    const newBudget = parseFloat(budgetInput)
    if (isNaN(newBudget) || newBudget < 0) return alert('Please enter a valid amount')
    
    const { data: existing } = await supabase.from('budget').select('*').eq('user_id', session.user.id).single()
    
    if (existing) {
      await supabase.from('budget').update({ total_budget: newBudget }).eq('user_id', session.user.id)
    } else {
      await supabase.from('budget').insert([{ user_id: session.user.id, total_budget: newBudget }])
    }
    
    setTotalBudget(newBudget)
    alert('Budget updated successfully!')
  }

  const calculateSpent = () => {
    return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
  }

  // --- INVENTORY FUNCTIONS ---
  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false })
    if (data) setMaterials(data)
  }

  const handleAddMaterial = async (e) => {
    e.preventDefault()
    await supabase.from('materials').insert([{ 
      name: matName, 
      stock_qty: parseFloat(matQty), 
      cost_per_unit: parseFloat(matCost) 
    }])
    setMatName('')
    setMatQty('')
    setMatCost('')
    fetchMaterials()
  }

  const handleDeleteMaterial = async (id) => {
    if (window.confirm('Are you sure you want to delete this material? This cannot be undone.')) {
      await supabase.from('materials').delete().eq('id', id)
      fetchMaterials()
    }
  }

  const handleLogout = async () => { 
    await supabase.auth.signOut() 
  }

  // --- LOGIN VIEW ---
  if (!session) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <h2 className="login-heading">🏭 Factory Portal</h2>
          <p className="login-subtitle">Sign in to manage your factory</p>
          <form className="login-form" onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.target)
            const email = formData.get('email')
            const password = formData.get('password')
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
              const errBox = document.getElementById('login-error')
              if (errBox) {
                errBox.textContent = error.message
                errBox.style.display = 'block'
              }
            }
          }}>
            <div id="login-error" className="login-error" style={{ display: 'none' }}></div>
            <label htmlFor="email">Email Address</label>
            <input type="email" name="email" id="email" className="input" placeholder="manager@factory.com" required />
            <label htmlFor="password">Password</label>
            <input type="password" name="password" id="password" className="input" placeholder="Enter your password" required />
            <button type="submit" className="btn btn-primary login-btn">Sign In</button>
          </form>
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
          {/* Budget Summary */}
          <div className="budget-summary">
            <h3>💰 Money Tracker</h3>
            <div className="budget-grid">
              <div className="budget-item">
                <label>Total Budget</label>
                <div className="amount">₹{parseFloat(totalBudget).toFixed(2)}</div>
              </div>
              <div className="budget-item">
                <label>Total Spent</label>
                <div className="amount">₹{calculateSpent().toFixed(2)}</div>
              </div>
              <div className="budget-item">
                <label>Remaining</label>
                <div className="amount">₹{(totalBudget - calculateSpent()).toFixed(2)}</div>
              </div>
            </div>
            <form onSubmit={handleUpdateBudget} className="budget-input-row">
              <input 
                type="number" 
                className="input" 
                placeholder="Update total budget" 
                value={budgetInput} 
                onChange={(e) => setBudgetInput(e.target.value)} 
                step="0.01"
              />
              <button type="submit" className="btn">Update Budget</button>
            </form>
          </div>

          {/* Expense Layout */}
          <div className="expense-layout">
            {/* LEFT SIDE: Entry Form */}
            <div className="card">
              <h3>Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="form-grid">
                <input type="date" className="input" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Category (e.g. Labor, Electricity, Transport)" 
                  value={expCategory} 
                  onChange={(e) => setExpCategory(e.target.value)} 
                  required 
                />
                <input type="number" className="input" placeholder="Amount (₹)" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} step="0.01" required />
                <input type="text" className="input" placeholder="Description (Optional)" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </form>
            </div>
            
            {/* RIGHT SIDE: Recent History */}
            <div className="card">
              <h3>Recent History</h3>
              <ul className="list">
                {(showAllExpenses ? expenses : expenses.slice(0, 10)).map((exp) => (
                  <li key={exp.id} className="list-item">
                    <div className="list-item-info">
                      <strong>{exp.category}</strong>
                      <small>{exp.description || 'No description'} • {exp.date}</small>
                    </div>
                    <div className="list-item-actions">
                      <div className="list-item-value text-danger">
                        ₹{parseFloat(exp.amount).toFixed(2)}
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteExpense(exp.id)}
                        title="Delete this expense"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
                {expenses.length === 0 && <li className="empty-state">No expenses recorded yet.</li>}
              </ul>
              
              {expenses.length > 10 && (
                <button 
                  className="show-more-btn"
                  onClick={() => setShowAllExpenses(!showAllExpenses)}
                >
                  {showAllExpenses ? 'Show Less' : `Show All (${expenses.length} entries)`}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* INVENTORY VIEW */}
      {view === 'inventory' && (
        <div className="inventory-layout">
          {/* LEFT SIDE: Entry Form */}
          <div className="card">
            <h3>Add Raw Material</h3>
            <form onSubmit={handleAddMaterial} className="form-grid">
              <input type="text" className="input" placeholder="Material Name (e.g. Steel)" value={matName} onChange={(e) => setMatName(e.target.value)} required />
              <input type="number" className="input" placeholder="Current Stock Quantity" value={matQty} onChange={(e) => setMatQty(e.target.value)} step="0.01" required />
              <input type="number" className="input" placeholder="Cost per Unit (₹)" value={matCost} onChange={(e) => setMatCost(e.target.value)} step="0.01" required />
              <button type="submit" className="btn btn-success">Add to Inventory</button>
            </form>
          </div>
          
          {/* RIGHT SIDE: Current Materials */}
          <div className="card">
            <h3>Current Materials</h3>
            <ul className="list">
              {materials.map((mat) => (
                <li key={mat.id} className="list-item">
                  <div className="list-item-info">
                    <strong>{mat.name}</strong>
                    <small>Cost: ₹{parseFloat(mat.cost_per_unit).toFixed(2)} / unit</small>
                  </div>
                  <div className="list-item-actions">
                    <div className="list-item-value text-primary">
                      {parseFloat(mat.stock_qty).toFixed(2)}
                    </div>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteMaterial(mat.id)}
                      title="Delete this material"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
              {materials.length === 0 && <li className="empty-state">No materials added yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default App