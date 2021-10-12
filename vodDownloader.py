import os
import sys
import pycurl
from termcolor import colored
from bs4 import BeautifulSoup

def getIndexUrl(base_url, username, password):
    # Fetch The Page
    curl = pycurl.Curl()
    curl.setopt(pycurl.URL, base_url)
    curl.setopt(pycurl.SSL_VERIFYPEER, 0)
    curl.setopt(pycurl.HTTPAUTH, pycurl.HTTPAUTH_NTLM)
    curl.setopt(pycurl.USERPWD, "{}:{}".format(username, password))
    index_file = open("res.html", 'wb')
    curl.setopt(curl.WRITEDATA, index_file)
    curl.perform()
    curl.close()

    # Extrach the id of the video
    script_tag = ""
    span_tag = ""
    with open("res.html") as fp:
        soup = BeautifulSoup(fp, 'html.parser')
        script_tag = soup.find_all('script', class_="dacast-video")[0]
        span_tag = soup.find_all('span', id="fileName")[0]
        
    tag_id = BeautifulSoup(str(script_tag), 'html.parser').script['id']
    filename = span_tag.string.split(':')[1].strip()

    # Form the url
    x = tag_id.split('_')[0]
    y = tag_id.split('_')[2]
    index_url = "https://dacasts3-vh.akamaihd.net/i/secure/{}/{}_,{}.raw,.csmil/index_0_av.m3u8?null=0".format(x, x, y)

    # Delete the fetched file & return
    index_file.close()
    os.remove("res.html")
    return [index_url, filename]

def fetchSegments(base_url):
	# Fetch video segments then save it to the m3u8 file
	print(colored("[.] Fetching segments...", 'red'))
	index_file = open("index_0_av.m3u8", 'wb')
	# Build request
	curl = pycurl.Curl()
	curl.setopt(curl.URL, base_url)
	curl.setopt(curl.WRITEDATA, index_file)
	curl.perform()
	# Close everything and print confirmation
	curl.close()
	index_file.close()
	sys.stdout.write("\033[F")
	sys.stdout.write("\033[K")
	print(colored("[+] Completed fetching segments", 'green'))

def filterSegments():
	# To remove the comments from the m3u8 file and save the segments' link to segemnts.txt
	index_file = open("index_0_av.m3u8", 'r')
	segments_file = open(fileName + "_segments.txt", 'w')
	number_of_lines = 0
	for line in index_file:
		if '#' not in line and line != '':
			segments_file.write(line)
			number_of_lines = number_of_lines + 1
	index_file.close()
	segments_file.close()
	os.remove("index_0_av.m3u8")
	return number_of_lines

def downloadSegments():
	number_of_lines = filterSegments()
	# Build progress bar
	progress_bar = "[" + " " * 100 + "]" 
	progress_bar_counter = 1
	print(colored("Downloading ==> ", 'red') + colored("".join(progress_bar), 'green'))
	segments_file = open(fileName + "_segments.txt", 'r')
	video = open(fileName + ".ts", 'wb')	

	# Start fetching
	for url in segments_file:
		# Build request
		curl = pycurl.Curl()
		curl.setopt(curl.WRITEDATA, video)
		curl.setopt(curl.URL, url.strip())
		downloaded = True
		try:
			curl.perform()
			# Update progress bar
			loaded = int((progress_bar_counter / number_of_lines) * 100)
			progress_bar = "[" + "=" * loaded + " " * (100 - loaded) + "]"
			progress_bar_counter += 1
			sys.stdout.write("\033[F")
			sys.stdout.write("\033[K")
			print(colored("Downloading " + str(loaded) + "% ==> ", 'red') + colored("".join(progress_bar), 'green'))
			# Close to start new session due to target server limits
			curl.close()
		except:
			sys.stdout.write("\033[F")
			sys.stdout.write("\033[K")
			sys.stdout.write("\033[F")
			sys.stdout.write("\033[K")
			print(colored("[!] Error Downloading: " + fileName, 'red'))
			failedVods.append(line.strip())
			downloaded = False
			break
	if downloaded:
		sys.stdout.write("\033[F")
		sys.stdout.write("\033[K")
		print(colored("[+] Downloaded", 'green'))
		print(colored("[-] Converting", 'red'))

		# Convert & Close everything
		segments_file.close()
		os.remove(fileName + "_segments.txt")
		os.system('ffmpeg -y -i "' + fileName + '.ts" "' + fileName + '" -loglevel quiet')
		os.remove(fileName + ".ts")
		sys.stdout.write("\033[F")
		sys.stdout.write("\033[K")
		sys.stdout.write("\033[F")
		sys.stdout.write("\033[K")
		sys.stdout.write("\033[F")
		sys.stdout.write("\033[K")
		print(colored("[+] Done downloading " + fileName, 'green'))

# Starting the everything
vods = open("VODs.txt", 'r')
failedVods = []
for line in vods:
	fileName = line.split('==')[0].strip()
	base_url = line.split('==')[1].strip()
	fetchSegments(base_url)
	downloadSegments()
vods.close()
os.remove("VODs.txt")

if len(failedVods) > 0:
	with open('VODs.txt', 'w') as f:
		for item in failedVods:
			f.write("%s\n" % item)