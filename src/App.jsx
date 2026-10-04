import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Labor')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  // 1. Handle Authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchExpenses()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchExpenses()
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Fetch Expenses
  const fetchExpenses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setExpenses(data)
    setLoading(false)
  }

  // 3. Add Expense
  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!amount || !category) return alert("Please fill in amount and category")

    const { error } = await supabase.from('expenses').insert([
      { date, category, amount: parseFloat(amount), description, user_id: session.user.id }
    ])

    if (error) {
      alert('Error adding expense: ' + error.message)
    } else {
      setAmount('')
      setDescription('')
      fetchExpenses() // Refresh list
    }
  }

  // 4. Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setExpenses([])
  }

  // --- LOGIN VIEW ---
  if (!session) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
        <h2>Factory Login</h2>
        <button onClick={async () => {
          const { error } = await supabase.auth.signInWithPassword({
            email: prompt('Enter Email'),
            password: prompt('Enter Password'),
          })
          if (error) alert(error.message)
        }}>
          Sign In / Sign Up (Auto-creates if new)
        </button>
        <p><small>Note: For this demo, try signing up with an email/password.</small></p>
      </div>
    )
  }

  // --- DASHBOARD VIEW ---
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Daily Expenses</h1>
        <button onClick={handleLogout} style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '5px 10px' }}>Logout</button>
      </header>

      {/* ADD FORM */}
      <form onSubmit={handleAddExpense} style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Add New Expense</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Labor">Labor</option>
            <option value="Electricity">Electricity</option>
            <option value="Raw Materials">Raw Materials</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Other">Other</option>
          </select>
          
          <input 
            type="number" 
            placeholder="Amount ($)" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            step="0.01"
            required 
          />
          
          <input 
            type="text" 
            placeholder="Description (e.g., Weekly wages)" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          />
          
          <button type="submit" style={{ background: '#1890ff', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}>
            Save Expense
          </button>
        </div>
      </form>

      {/* EXPENSE LIST */}
      <h3>Recent History</h3>
      {loading ? <p>Loading...</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {expenses.map((exp) => (
            <li key={exp.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{exp.category}</strong>: {exp.description}
                <br />
                <small style={{ color: '#666' }}>{exp.date}</small>
              </div>
              <div style={{ fontWeight: 'bold', color: '#d9363e' }}>
                ${parseFloat(exp.amount).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {expenses.length === 0 && !loading && <p>No expenses recorded yet.</p>}
    </div>
  )
}

export default App