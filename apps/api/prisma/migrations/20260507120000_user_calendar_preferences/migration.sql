CREATE TABLE "UserCalendarPreference" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "groupId"       TEXT NOT NULL,
  "filterMode"    TEXT NOT NULL DEFAULT 'all',
  "tagIds"        TEXT NOT NULL DEFAULT '',
  "calendarToken" TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCalendarPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserCalendarPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserCalendarPreference_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserCalendarPreference_calendarToken_key" ON "UserCalendarPreference"("calendarToken");
CREATE UNIQUE INDEX "UserCalendarPreference_userId_groupId_key" ON "UserCalendarPreference"("userId", "groupId");
CREATE INDEX "UserCalendarPreference_userId_idx" ON "UserCalendarPreference"("userId");
CREATE INDEX "UserCalendarPreference_calendarToken_idx" ON "UserCalendarPreference"("calendarToken");
