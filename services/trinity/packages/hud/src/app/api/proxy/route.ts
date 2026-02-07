import { NextRequest, NextResponse } from 'next/server'

const GAING_BRAIN_URL = process.env.GAING_BRAIN_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })

    const body = await request.json()
    const target = `${GAING_BRAIN_URL}/${endpoint.replace(/^\//, '')}`

    try {
        const res = await fetch(target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const data = await res.json()
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: 'Proxy failure' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })

    const target = `${GAING_BRAIN_URL}/${endpoint.replace(/^\//, '')}`

    try {
        const res = await fetch(target)
        const data = await res.json()
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: 'Proxy failure' }, { status: 500 })
    }
}
