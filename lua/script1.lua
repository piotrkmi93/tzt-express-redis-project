local osoby = redis.pcall('keys', 'kh_*')
local n = table.getn(osoby)
local osoby_dane = {}
for i=1, n do
  local tmp_osoba = redis.call('hgetall', osoby[i])
  local n2 = table.getn(tmp_osoba)
  local tmp_table = {}
  tmp_table[1] = osoby[i]
  for j=2, n2, 2 do
    tmp_table[(j/2)+1] = tmp_osoba[j-1] .. ': ' .. tmp_osoba[j]
  end
  osoby_dane[i] = tmp_table
end
return osoby_dane
