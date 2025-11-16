import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function ScanTable(){
  const navigate = useNavigate()
  const rows = [
    { host: 'example.com', fecha: 'hace 2h', riesgo: '🔴 Alto' },
    { host: 'tiendita.net', fecha: 'hace 4h', riesgo: '🟢 Bajo' },
    { host: 'api.demo.io', fecha: 'ayer', riesgo: '🟡 Med' },
  ]
  return (
    <table className="w-full console-table">
      <thead>
        <tr><th>HOST</th><th>FECHA</th><th>RIESGO</th><th>ACCIONES</th></tr>
      </thead>
      <tbody>
        {rows.map((r,i)=> (
          <tr key={i}>
            <td>{r.host}</td>
            <td className="small">{r.fecha}</td>
            <td>{r.riesgo}</td>
            <td><button className="btn" onClick={()=>navigate('/report')}>Ver Reporte</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
