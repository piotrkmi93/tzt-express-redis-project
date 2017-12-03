local zbiory = redis.pcall('keys', 'ks_*')
local zn = table.getn(zbiory)
local wyniki = {}
local operacje = {'sdiff', 'sunion', 'sinter'}
local on = table.getn(operacje)

local index = 1;
for i=1, zn do
  for j=1, zn do
    if i ~= j then
      for k=1, on do
        local wynik_tmp = "Wynik " .. operacje[k] .. ' ' .. zbiory[i] .. ' ' .. zbiory[j] .. ': '
        local wynik = redis.call(operacje[k], zbiory[i], zbiory[j])
        local wn = table.getn(wynik)
        for l=1, wn do
          wynik_tmp = wynik_tmp .. wynik[l]
          if l ~= wn then
            wynik_tmp = wynik_tmp .. ', '
          end
        end
        wyniki[index] = wynik_tmp
        index = index + 1
      end
    end
  end
end

return wyniki
