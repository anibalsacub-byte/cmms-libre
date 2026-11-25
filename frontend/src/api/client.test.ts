import { describe, expect, it, vi } from 'vitest'
import { api, obtenerTodos } from './client'

describe('obtenerTodos', () => {
  it('sigue el campo next hasta traer las 40 filas, no solo la primera página de 25', async () => {
    const pagina1 = {
      count: 40,
      next: 'http://127.0.0.1:8000/api/inventory/materiales/?page=2',
      previous: null,
      results: Array.from({ length: 25 }, (_, i) => ({ id: i + 1, codigo: `MAT-${i + 1}` })),
    }
    const pagina2 = {
      count: 40,
      next: null,
      previous: 'http://127.0.0.1:8000/api/inventory/materiales/?page=1',
      results: Array.from({ length: 15 }, (_, i) => ({ id: i + 26, codigo: `MAT-${i + 26}` })),
    }

    const spy = vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/inventory/materiales/') return Promise.resolve({ data: pagina1 })
      if (url === pagina1.next) return Promise.resolve({ data: pagina2 })
      return Promise.reject(new Error(`URL inesperada: ${url}`))
    })

    const materiales = await obtenerTodos<{ id: number; codigo: string }>('/inventory/materiales/')

    expect(materiales).toHaveLength(40)
    expect(materiales.map((m) => m.id)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
    expect(spy).toHaveBeenCalledTimes(2)

    spy.mockRestore()
  })
})
