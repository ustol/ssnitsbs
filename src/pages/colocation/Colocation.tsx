import { Wrench } from 'lucide-react'

export function Colocation() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
        <Wrench size={26} className="text-zinc-400" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-800">Page Under Maintenance</h2>
      <p className="text-sm text-zinc-500 mt-2 max-w-sm">
        The Colocation page is currently being rebuilt. It will be back shortly with improvements.
      </p>
    </div>
  )
}
