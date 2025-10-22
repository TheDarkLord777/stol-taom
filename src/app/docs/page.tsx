"use client"
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react').then(m => m.default), { ssr: false })

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <SwaggerUI url="/api/openapi" docExpansion="list" defaultModelsExpandDepth={1} />
    </div>
  )
}
