import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { OccurrenceDetail } from '../types'

export function NewOccurrencePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const created = await api<OccurrenceDetail>('/api/occurrences', { method: 'POST', body: form })
      navigate(`/ocorrencias/${created.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar.')
      setBusy(false)
    }
  }

  return <div className="narrow-page">
    <Link to="/ocorrencias" className="back-link">Voltar às ocorrências</Link>
    <div className="page-heading"><div><p className="context-label">Nova ordem de serviço</p><h1>Conte o que aconteceu</h1><p>Informações claras ajudam a equipe a localizar, priorizar e resolver.</p></div></div>
    <form className="panel form-sheet stack-form" onSubmit={submit}>
      <label>Título<input name="Title" minLength={3} maxLength={160} placeholder="Ex.: Lâmpada queimada na entrada" required /></label>
      <label>Descrição<textarea name="Description" rows={5} minLength={5} maxLength={4000} placeholder="Descreva o problema e como ele afeta o local." required /></label>
      <div className="form-grid"><label>Categoria<input name="Category" minLength={2} maxLength={100} placeholder="Iluminação, limpeza…" required /></label><label>Localização<input name="Location" minLength={2} maxLength={300} placeholder="Bloco, andar ou referência" required /></label></div>
      <label className="upload-field">Imagem <input name="Image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><small>Opcional · JPEG, PNG, WebP ou GIF · até 5 MB</small></label>
      {error && <div className="alert error">{error}</div>}
      <div className="form-actions"><Link className="button ghost" to="/ocorrencias">Cancelar</Link><button className="button primary" disabled={busy}>{busy ? 'Registrando…' : 'Registrar ocorrência'}</button></div>
    </form>
  </div>
}
