export const RESTAURANT_SETTINGS_ID = 1

export const HOURS_OF_OPERATION = [
  { days: 'Monday - Thursday', hours: '10:00 PM - 12:00 AM' },
  { days: 'Friday - Saturday', hours: '11:00 PM - 1:00 AM' },
  { days: 'Sunday', hours: 'Hours vary' },
]

export type RestaurantSettings = {
  id: number
  is_open: boolean
  updated_at: string
}
