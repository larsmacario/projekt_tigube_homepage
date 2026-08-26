"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ContactForm } from "@/components/contact-form"
import { cn } from "@/lib/utils"

type AnimalType = "dog" | "cat"

interface BookingModalProps {
  animalType: AnimalType
  children: ReactNode
}

export function BookingModal({ animalType, children }: BookingModalProps) {
  const idPrefix =
    animalType === "dog" ? "modal-hund-" : "modal-katze-"

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          "left-[50%] top-[50%] flex max-h-[min(88dvh,calc(100dvh-1.25rem))] w-[calc(100vw-1.25rem)] max-w-xl translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-x-hidden overflow-y-auto overscroll-contain p-0 pt-11 sm:max-h-[85vh] sm:w-full sm:max-w-xl sm:p-0 sm:pt-12 sm:pb-4",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg touch-pan-y"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Unverbindliche Anfrage</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 px-3 pb-3 sm:px-4 sm:pb-4">
          <ContactForm
            variant="modal"
            idPrefix={idPrefix}
            defaultPet={animalType === "dog" ? "Hund" : "Katze"}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
