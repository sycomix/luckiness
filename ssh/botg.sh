#!/bin/bash

base58=({1..9} {A..H} {J..N} {P..Z} {a..k} {m..z})
bitcoinregex="^[$(printf "%s" "${base58[@]}")]{34}$"

decodeBase58() {
    local s=$1
    for i in {0..57}
    do s="${s//${base58[i]}/ $i}"
    done
    dc <<< "16o0d${s// /+58*}+f"
}

encodeBase58() {
    # 58 = 0x3A
    bc <<<"ibase=16; n=${1^^}; while(n>0) { n%3A ; n/=3A }" |
    tac |
    while read n
    do echo -n ${base58[n]}
    done
}

checksum() {
    xxd -p -r <<<"$1" |
    openssl dgst -sha256 -binary |
    openssl dgst -sha256 -binary |
    xxd -p -c 80 |
    head -c 8
}

checkBitcoinAddress() {
    if [[ "$1" =~ $bitcoinregex ]]
    then
        h=$(decodeBase58 "$1")
        checksum "00${h::${#h}-8}" |
        grep -qi "^${h: -8}$"
    else return 2
    fi
}

hash160() {
    openssl dgst -sha256 -binary |
    openssl dgst -rmd160 -binary |
    xxd -p -c 80
}

hash160ToAddress() {
    printf "%34s\n" "$(encodeBase58 "00$1$(checksum "00$1")")" |
    sed "y/ /1/"
}

publicKeyToAddress() {
    hash160ToAddress $(
    openssl ec -pubin -pubout -outform DER |
    tail -c 65 |
    hash160
    )
}

hash256ToAddress() {
	#printf "80$1$(checksum "80$1")"
    printf "%34s\n" "$(encodeBase58 "80$1$(checksum "80$1")")" |
    sed "y/ /1/"
}


privateKeyToWIF() {
    hash256ToAddress $(openssl ec -text -noout -in data.pem | head -5 | tail -3 | fmt -120 | sed 's/[: ]//g')
}

# echo " "
# echo "BITCOINS OFF-THE-GRID (BOTG) v0.1.1: One of the most secure savings you'll ever get!"
# echo " "
# echo "For BEST results:"
# echo " "
# echo "-run './botg' from a Live Linux CD"
# echo "-run this script with the Internet turned off"
# echo "-reboot computer when done"
# echo "-never record the secret key on a computer"
# echo "-safely hide the key on a peice of paper where it won't get stolen"
# echo "eg. hiding the paper in your car or inside your TV means you'll "
# echo "never be able to get your money if that thing is stolen."
# echo "-if you are not hiding the key, lock it up in a safe or safety deposit box"
# echo " "
# echo "***BOTG's strength is that since the secret key is never stored on your computer"
# echo "there is nothing for a virus, malware, or spyware to steal!***"
# echo " "
# echo "Type and/or move the mouse for about 5 minutes. This will help improve the"
# echo "randomness of your key....."
# echo "Pressing ENTER will continue the script!"

# read random

openssl  ecparam -genkey -name secp256k1 | tee data.pem &>/dev/null

# echo " "
# echo " "
# echo "The following is the secret key in hex format. Record it carefully."
# echo "Record the whole line after a 'read EC key'"
# echo " "

hexsize=$(openssl ec -text -noout -in data.pem | head -5 | tail -3 | fmt -120 | sed 's/[: ]//g' )

while [ ${#hexsize} -ne 64 ]
do
openssl  ecparam -genkey -name secp256k1 | tee data.pem &>/dev/null && hexsize=$(openssl ec -text -noout -in data.pem | head -5 | tail -3 | fmt -120 | sed 's/[: ]//g' )
done

openssl ec -text -noout -in data.pem | head -5 | tail -3 | fmt -120 | sed 's/[: ]//g'

# echo "Hit ENTER to continue"
# read random

# echo " "
# echo "The following is the secret key in base58. This is the most"
# echo "common format to import your key. Make sure to copy it down"
# echo "carefully. Either this or the hex code could be used but it's"
# echo "best to record both for redundancy. These two codes are to "
# echo "be kept secret on a peice of paper or written down"
# echo "somewhere safe. Putting them on a computer will lesson"
# echo "the security of these keys."
# echo "The address should begin with '5'."
# echo " "

privateKeyToWIF >> keys_wif.txt

# echo "Hit ENTER to continue"
# read random

# echo " "
# echo "The following is the Bitcoin address you can send your savings to."
# echo "Record the address carefully. It is not critical you keep this address"
# echo "secret. Only the two other codes must remain secret!"
# echo "The line that begins with the number 1 is your Bitcoin address you send"
# echo "the funds to."
# echo " "

openssl ec -pubout < data.pem | publicKeyToAddress

openssl  ecparam -genkey -name secp256k1 | tee data.pem &>/dev/null && rm data.pem

# echo " "
# echo "Hit ENTER to exit"
# read random
# exit 0


