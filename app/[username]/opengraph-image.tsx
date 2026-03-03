import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
 
export const alt = 'User Profile';
export const size = {
  width: 1200,
  height: 630,
};
 
export const contentType = 'image/png';
 
export default async function Image({ params }: { params: { username: string } }) {
  try {
    // Fetch user data
    const response = await fetch(`https://tarpai-back-x753.onrender.com/users?username=${params.username}`);
    const users = await response.json();
    const user = users.find((u: any) => u.username === params.username);
    
    if (!user) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 128,
              background: 'black',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            User Not Found
          </div>
        ),
        {
          ...size,
        }
      );
    }
 
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          <img
            src={user.avatar}
            alt={user.displayName || user.name}
            width="200"
            height="200"
            style={{
              borderRadius: '100px',
              marginBottom: '30px',
            }}
          />
          <div
            style={{
              fontSize: 60,
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '10px',
            }}
          >
            {user.displayName || user.name}
          </div>
          <div
            style={{
              fontSize: 40,
              color: '#999',
              marginBottom: '20px',
            }}
          >
            @{user.username}
          </div>
          {user.bio && (
            <div
              style={{
                fontSize: 30,
                color: '#ccc',
                textAlign: 'center',
                maxWidth: '800px',
              }}
            >
              {user.bio}
            </div>
          )}
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'black',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          Error Loading Profile
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
