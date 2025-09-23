import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfileCard() {
  return (
    <Card className="w-full max-w-sm shadow-md">
      <CardHeader>
        <CardTitle>Jane Doe</CardTitle>
        <CardDescription>Frontend Developer</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm">
          Passionate about UI/UX design, accessibility, and web performance.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline">View Profile</Button>
      </CardFooter>
    </Card>
  )
}
