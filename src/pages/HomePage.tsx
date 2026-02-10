import { useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <h1>Protected Home</h1>
      <p>Signed in as: {user?.email ?? 'unknown user'}</p>
      <button onClick={handleSignOut} type="button">
        Sign out
      </button>
    </main>
  )
}
