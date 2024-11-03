import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json()

    const validCredentials = {
      student: { email: 'stu@test.com', password: '123456' },
      instructor: { email: 'ins@test.com', password: '123456' }
    };

    const credentials = validCredentials[role as keyof typeof validCredentials];
    
    if (email === credentials.email && password === credentials.password) {
      return NextResponse.json({
        token: 'dummy_token',
        user: { id: '1', email, role }
      })
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 