/** Existing public search allocation policy. Age band stays 0..12 at this ingress. */
export function createRoomsPayload(guests: { adults: number; children: number; childAges: Array<number | null>; rooms: number }) {
  if (!Number.isSafeInteger(guests.adults) || !Number.isSafeInteger(guests.rooms) || guests.rooms < 1 || guests.adults < guests.rooms ||
      !Number.isSafeInteger(guests.children) || guests.children < 0 || guests.childAges.length !== guests.children ||
      guests.childAges.some(a => a === null || !Number.isSafeInteger(a) || a < 0 || a > 12)) throw new Error('SEARCH_ROOM_COMPOSITION_INVALID');
  const rooms = Array.from({ length: guests.rooms }, () => ({ adults: 1, children: 0, childAges: [] as number[] }));
  for (let i = 0; i < guests.adults - guests.rooms; i++) rooms[i % rooms.length].adults++;
  guests.childAges.forEach((age, i) => { const room = rooms[i % rooms.length]; room.childAges.push(age!); room.children++; });
  return rooms;
}
