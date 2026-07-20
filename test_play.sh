#!/usr/bin/expect
set timeout -1
spawn npm run play:cli
expect "Select an option:"
send "1\r"
for {set i 0} {$i < 10} {incr i} {
    expect "Select an option:"
    send "2\r"
}
expect "Press Enter to start next week..."
send "\r"
expect "Select an option:"
send "0\r"
expect eof
