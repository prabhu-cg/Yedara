"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      // Bottom centre, not bottom right: the drawer footer's primary button and the Feedback button live at the
      // bottom right, and a toast under the pointer never times out (Sonner pauses a hovered toast).
      position="bottom-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!border-border !bg-popover !text-popover-foreground !rounded-lg !shadow-md !font-sans",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
