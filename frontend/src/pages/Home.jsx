import { SignInButton, SignOutButton, SignedOut } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { useUser } from '@clerk/clerk-react'

const Home = () => {
    const {isSignedIn} = useUser()
  return (
    <div>
        <button className='btn btn-neutral' onClick={()=>toast.success('hello')}>click me</button>
      {isSignedIn ? (
        <SignOutButton>
            <button>Sign Out</button>
        </SignOutButton>
      ) : (
        <SignInButton mode='modal'>
        <button>Sign In</button>
      </SignInButton>
      )}
    </div>
  )
}

export default Home