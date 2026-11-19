"use client";
import { useI18n } from "./providers";
import { Card, CardText } from "./ui/card";

export function NotAllowed() {
  const { t, user } = useI18n();
  return (
    <Card>
      <CardText>{user ? t.common.notAllowed : t.auth.choosePersona}</CardText>
    </Card>
  );
}
