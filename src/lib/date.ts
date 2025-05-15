import { parse, format } from 'date-fns'

export const formatDate = (
  date: string,
  parseFormat: string = "yyyy-MM-dd'T'HH:mm",
  formatDate: string = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
) => {
  if (!date) return ''
  const parsedDate = parse(date, parseFormat, new Date())
  const formattedDate = format(parsedDate, formatDate)

  return formattedDate
}
