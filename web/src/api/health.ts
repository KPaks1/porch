export type Health = { status: string }

export async function getHealth(signal? :AbortSignal): Promise<Health>{
    
    const res = await fetch('/health', {signal})

    if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
        return res.json() as Promise<Health>
}