// components/MyPopup.tsx
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog";
  
  import { Button } from "@/components/ui/button";
  
  export default function MyPopup() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="default">Open Popup</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hello!</DialogTitle>
            <DialogDescription>This is a custom popup.</DialogDescription>
          </DialogHeader>
          <p className="text-sm mt-4">You can put anything here: text, forms, actions.</p>
          <DialogFooter className="mt-4">
            <Button variant="secondary">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  