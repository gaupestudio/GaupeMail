$n = Get-Random -Minimum 0 -Maximum 101
"{0}.{1}/5.0" -f [math]::Floor($n / 10), ($n % 10)