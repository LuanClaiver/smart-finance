import { useEffect, useState, type ReactNode } from 'react'
import { authenticateBiometric, biometricAvailability, getSecuritySettings, verifySecurityPin, type SecuritySettings } from '../services/mobile/security'

export default function MobileLockGate({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [biometric, setBiometric] = useState(false)

  useEffect(() => {
    void Promise.all([getSecuritySettings(), biometricAvailability()]).then(([next, availability]) => {
      setSettings(next)
      setBiometric(next.biometric && availability.available)
      setLocked(next.enabled)
    })
  }, [])

  useEffect(() => {
    if (!settings?.enabled) return
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      if (document.visibilityState === 'visible' && hiddenAt && Date.now() - hiddenAt >= settings.timeoutMinutes * 60_000) {
        setPin(''); setError(''); setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [settings])

  async function unlockPin() {
    if (await verifySecurityPin(pin)) { setLocked(false); setPin(''); setError(''); return }
    setError('PIN incorreto.')
  }
  async function unlockBiometric() {
    if (await authenticateBiometric()) { setLocked(false); setError('') }
    else setError('Não foi possível confirmar a biometria.')
  }

  if (!settings) return <>{children}</>
  return <>{children}{locked && <div className="app-lock-overlay" role="dialog" aria-modal="true" aria-label="Smart Finance bloqueado">
    <div className="app-lock-card"><img src="/icon.svg" alt=""/><span className="panel-kicker">Proteção do aplicativo</span><h2>Smart Finance bloqueado</h2><p>Digite seu PIN ou use a biometria para continuar.</p>
      <input className="app-lock-pin" inputMode="numeric" pattern="[0-9]*" type="password" maxLength={8} placeholder="PIN" value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,''))} onKeyDown={(e)=>{if(e.key==='Enter')void unlockPin()}} autoFocus />
      {error&&<div className="form-error">{error}</div>}<button className="primary-button" onClick={()=>void unlockPin()} disabled={pin.length<4}>Desbloquear</button>{biometric&&<button className="secondary-button" onClick={()=>void unlockBiometric()}>Usar biometria</button>}
    </div>
  </div>}</>
}
