import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

declare module "@/components/ui/dialog" {
  interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
    showCloseButton?: boolean
    resizable?: boolean
  }

  export const DialogContent: React.ForwardRefExoticComponent<
    DialogContentProps & React.RefAttributes<HTMLDivElement>
  >
}