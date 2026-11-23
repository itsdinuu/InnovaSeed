export const PLEGO_MENTORSHIP_CTA_URL =
  process.env.NEXT_PUBLIC_PLEGO_MENTORSHIP_URL ||
  'https://lynk.id/plegoindonesia/k829lkgw9g2d'

export function getCompetitionMentorshipUrl(competitionTitle?: string): string {
  try {
    const url = new URL(PLEGO_MENTORSHIP_CTA_URL)
    if (competitionTitle && competitionTitle.trim()) {
      url.searchParams.set('competition', competitionTitle.trim())
    }
    return url.toString()
  } catch {
    return PLEGO_MENTORSHIP_CTA_URL
  }
}