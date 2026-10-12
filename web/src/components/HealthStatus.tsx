import { useEffect, useState } from 'react'
import { getHealth, type Health } from '../api/health'

type State = 
    | {kind: 'loading' }
    | {kind: 'ok', data: Health }
    | {kind: 'error', message: string }

export function HealthStatus(){
    const [state, setState] = useState<State>({ kind: 'loading'})

    useEffect(() => {
        const controller = new AbortController()

        getHealth(controller.signal)
            .then((data) => setState({kind: 'ok', data}))
            .catch((err: unknown) => {
                if (controller.signal.aborted) return
            setState({
                kind: 'error',
                message: err instanceof Error ? err.message : 'Unkown error',
            })
        })

        return () => controller.abort()
    }, [])

    if (state.kind === 'loading') return <p>Checking API</p>
    if (state.kind === 'error') return <p>API unreachable {state.message}</p>
    return <p>API status: {state.data.status}</p>
}