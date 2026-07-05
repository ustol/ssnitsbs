import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIDocumentModal } from '@/components/shared/AIDocumentModal'
import { buildPartnershipReportPrompt } from '@/lib/partnershipReport'
import { generatePartnershipReportPdf } from '@/lib/pdf'
import type { PartnershipWithRelations } from '@/types/database'

interface VitalInfoItem {
  date: string
  subject: string
  details: string | null
}

interface PartnershipReportButtonProps {
  partnership: PartnershipWithRelations
  vitalInfo: VitalInfoItem[]
}

export function PartnershipReportButton({ partnership, vitalInfo }: PartnershipReportButtonProps) {
  const [open, setOpen] = useState(false)
  const prompt = buildPartnershipReportPrompt(partnership, vitalInfo)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />Report
      </Button>
      <AIDocumentModal
        open={open}
        onClose={() => setOpen(false)}
        prompt={prompt}
        headerTitle="AI Partnership Report"
        headerSubtitle="Progress report covering all meetings and outcomes"
        loadingText="Drafting partnership report…"
        generateLabel="Generate Report"
        onSavePdf={text => generatePartnershipReportPdf(text, partnership.title)}
      />
    </>
  )
}
