import { useState, useRef } from 'react'
import { Plane, Upload, FileSpreadsheet } from 'lucide-react'
import { useCargaMasiva, useVuelos, useAnularVuelo } from '../../hooks/useVuelos'
import { formatearFecha } from '../../utils/formatters'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import InfoModal from '../../components/ui/InfoModal.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import styles from './AdminVuelosPage.module.css'

const BADGE_MAP = { CANCELACION: 'danger', DEMORA: 'warning', REPROGRAMADO: 'warning', PROGRAMADO: 'info' }

export default function AdminVuelosPage() {
  const { data: pageData, isLoading } = useVuelos({ page: 0, size: 50 })
  const vuelos = pageData?.content ?? []

  const cargaMasiva = useCargaMasiva()
  const anular = useAnularVuelo()

  const [modal, setModal] = useState({ open: false, type: 'info', title: '', message: '' })
  const [confirm, setConfirm] = useState({ open: false, id: null, codigo: '' })
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const showModal = (type, title, message) => setModal({ open: true, type, title, message })

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.xlsx')) return showModal('error', 'Formato inválido', 'Solo se aceptan archivos .xlsx')
    const fd = new FormData()
    fd.append('archivo', file)
    try {
      const { data } = await cargaMasiva.mutateAsync(fd)
      showModal('success', 'Carga exitosa', `Vuelos importados correctamente. ${data?.data?.registros ?? ''} registros procesados.`)
    } catch (err) {
      showModal('error', 'Error en la carga', err.response?.data?.message ?? 'El archivo no pudo procesarse.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const handleAnular = async () => {
    try {
      await anular.mutateAsync(confirm.id)
      showModal('success', 'Vuelo anulado', `El vuelo ${confirm.codigo} fue anulado.`)
    } catch (err) { showModal('error', 'Error', err.response?.data?.message ?? 'No se pudo anular el vuelo.') }
    finally { setConfirm({ open: false, id: null, codigo: '' }) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Plane size={24} color="var(--rol-admin)" />
        <div>
          <h1 className={styles.title}>Carga Masiva de Vuelos</h1>
          <p className={styles.sub}>Importa vuelos desde un archivo Excel (.xlsx)</p>
        </div>
      </div>

      <div className={styles.uploadCard}>
        <div
          className={[styles.dropZone, dragging ? styles.dragOver : ''].join(' ')}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet size={48} color={dragging ? 'var(--success)' : 'var(--primary)'} />
          <p className={styles.dropTitle}>Arrastra el archivo Excel aquí</p>
          <p className={styles.dropSub}>o haz clic para seleccionar</p>
          <span className={styles.dropFormat}>Formato: .xlsx — columnas: aerolinea, codigoVuelo, origen, destino, fechaVuelo, tipoContingencia</span>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>
        {cargaMasiva.isPending && (
          <div className={styles.uploadingBar}><Upload size={16} /> Procesando archivo...</div>
        )}
      </div>

      <div className={styles.tableWrap}>
        <h2 className={styles.sectionTitle}>Vuelos registrados ({vuelos.length})</h2>
        {isLoading ? <p className={styles.loading}>Cargando...</p> : (
          <table className={styles.table}>
            <thead>
              <tr>
                {['Código', 'Aerolínea', 'Ruta', 'Fecha', 'Contingencia', 'Estado', 'Acciones'].map(h =>
                  <th key={h} className={styles.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {vuelos.map(v => (
                <tr key={v.id} className={styles.tr}>
                  <td className={styles.td}><strong>{v.codigoVuelo}</strong></td>
                  <td className={styles.td}>{v.aerolinea}</td>
                  <td className={styles.td}>{v.origen} → {v.destino}</td>
                  <td className={styles.td}>{v.fechaVuelo?.slice(0,16)?.replace('T',' ')}</td>
                  <td className={styles.td}><Badge label={v.tipoContingencia} variant={BADGE_MAP[v.tipoContingencia] ?? 'neutral'} /></td>
                  <td className={styles.td}><Badge label={v.estado === 'ANULADO' ? 'ANULADO' : 'ACTIVO'} variant={v.estado === 'ANULADO' ? 'danger' : 'success'} /></td>
                  <td className={styles.td}>
                    {v.estado !== 'ANULADO' && (
                      <Button size="sm" variant="danger" onClick={() => setConfirm({ open: true, id: v.id, codigo: v.codigoVuelo })}>
                        Anular
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal open={confirm.open} title="Anular vuelo"
        message={`¿Deseas anular el vuelo ${confirm.codigo}? Esta acción no se puede deshacer.`}
        onClose={() => setConfirm({ open: false, id: null, codigo: '' })}
        onConfirm={handleAnular} loading={anular.isPending} confirmLabel="Anular vuelo" />
      <InfoModal open={modal.open} type={modal.type} title={modal.title} message={modal.message}
        onClose={() => setModal(m => ({ ...m, open: false }))} />
    </div>
  )
}
