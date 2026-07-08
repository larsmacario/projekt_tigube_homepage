'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SignatureMobilePage() {
  const params = useParams()
  const sessionId = params.id as string
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'pending' | 'success'>('pending')

  useEffect(() => {
    if (sessionId) {
      checkSession()
    }
  }, [sessionId])

  async function checkSession() {
    try {
      const response = await fetch(`/api/portal/signatures/session?id=${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ungültige Unterschriften-Session')
      }

      if (data.session.status === 'completed') {
        setStatus('success')
      }
    } catch (err: any) {
      setError(err.message || 'Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  // Verhindere Scrollen auf der gesamten mobilen Signaturseite
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [])

  // Setup Canvas touch events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || status !== 'pending') return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let currentWidth = 0

    // Funktion zum Anpassen der Canvas-Größe bei Rotation/Größenänderung
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width > 0 ? rect.width : (canvas.offsetWidth > 0 ? canvas.offsetWidth : 350)
      
      // Verhindert das Löschen des Canvas bei reinem vertikalen Scrollen (Ein-/Ausblenden der URL-Bar)
      if (width === currentWidth) return
      currentWidth = width

      const height = 200
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#0f172a' // slate-900
    }

    // Initial ausführen und Listener binden
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('orientationchange', resizeCanvas)

    let drawing = false

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const canvasRect = canvas.getBoundingClientRect()
      
      const isTouch = e.type.startsWith('touch')
      
      let clientX, clientY
      if (isTouch) {
        const touchEvent = e as TouchEvent
        const touch = (touchEvent.touches && touchEvent.touches[0]) || 
                      (touchEvent.changedTouches && touchEvent.changedTouches[0])
        if (!touch) return null
        clientX = touch.clientX
        clientY = touch.clientY
      } else {
        const mouseEvent = e as MouseEvent
        clientX = mouseEvent.clientX
        clientY = mouseEvent.clientY
      }

      return {
        x: clientX - canvasRect.left,
        y: clientY - canvasRect.top
      }
    }

    // Drawing Handlers
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      drawing = true
      const coords = getCoordinates(e)
      if (coords) {
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
      }
      
      if (e.cancelable) {
        e.preventDefault()
      }
    }

    const stopDrawing = () => {
      drawing = false
      ctx.beginPath()
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return
      
      if (e.cancelable) {
        e.preventDefault()
      }

      const coords = getCoordinates(e)
      if (coords) {
        ctx.lineTo(coords.x, coords.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
      }
    }

    // Attach Event Listeners
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseleave', stopDrawing)

    canvas.addEventListener('touchstart', startDrawing, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDrawing)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('orientationchange', resizeCanvas)

      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseleave', stopDrawing)

      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [status, loading])


  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const submitSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Convert Canvas to Base64
    const signatureData = canvas.toDataURL('image/png')

    // simple check to ensure canvas is not completely empty/blank (optional but good)
    // Here we just proceed to submit the base64 string.
    try {
      setLoading(true)
      const response = await fetch('/api/portal/signatures/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          signature_data: signatureData
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Senden der Unterschrift')
      }

      setStatus('success')
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  if (loading && status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 text-center">Fehler</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sage-700">{error}</p>
            <Button onClick={() => { setError(''); checkSession(); }} className="bg-sage-600 hover:bg-sage-700">
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-emerald-600 text-center">✓ Erfolg</CardTitle>
            <CardDescription className="text-center">Unterschrift erfolgreich übermittelt!</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 py-4">
            <p className="text-sage-700">
              Vielen Dank. Deine Unterschrift wurde empfangen. Du kannst diesen Tab jetzt schließen und auf deinem PC-Bildschirm fortfahren.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sage-50 px-4 py-2 select-none">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg border border-sage-200 p-4 space-y-3">
        <div className="block landscape:hidden text-center text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
          🔄 Tipp: Drehe dein Handy ins Querformat für mehr Platz zum Unterschreiben!
        </div>

        <div className="border border-dashed border-sage-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-[200px] cursor-crosshair"
            style={{ display: 'block', touchAction: 'none' }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearCanvas}
            className="flex-1 border-sage-300 text-sage-700 hover:bg-sage-50 py-2 text-sm"
          >
            Löschen
          </Button>
          <Button
            onClick={submitSignature}
            className="flex-1 bg-sage-600 hover:bg-sage-700 text-white py-2 text-sm"
          >
            Senden
          </Button>
        </div>
      </div>
    </div>
  )
}
