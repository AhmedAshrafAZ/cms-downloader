import os
import sys
from io import BytesIO
import simplejson as json
import pycurl
from termcolor import colored
import argparse

def getIndexUrl(base_url):
	c = pycurl.Curl()
	b = BytesIO()
	c.setopt(c.URL, base_url)
	c.setopt(pycurl.SSL_VERIFYPEER, 0)
	c.setopt(c.WRITEFUNCTION, b.write)
	c.setopt(c.WRITEDATA, b)
	finalUrl = ""
	try:
		c.perform()
		tempUrl = json.loads(b.getvalue())['hls']
		finalUrl = (tempUrl.split('?')[0]).replace('master.m3u8', 'index_0_av.m3u8')
	except:
		sys.stdout.write("\033[F")
		sys.stdout.write("\033[K")
		print(colored("[!] Error Downloading: " + fileName, 'red'))
		failedVods.append(line.strip())
	c.close()
	b.close()
	return finalUrl

def fetchSegments(base_url):
	# Fetch video segments then save it to the m3u8 file
	print(colored("[.] Fetching segments...", 'red'))
	index_file = open("index_0_av.m3u8", 'wb')
	# Build request
	curl = pycurl.Curl()
	curl.setopt(curl.URL, base_url)
	curl.setopt(pycurl.SSL_VERIFYPEER, 0)
	curl.setopt(curl.WRITEDATA, index_file)
	curl.perform()
	# Close everything and print confirmation
	curl.close()
	index_file.close()
	sys.stdout.write("\033[F")
	sys.stdout.write("\033[K")
	print(colored("[+] Completed fetching segments", 'green'))

def filterSegments():
	# To remove the comments from the m3u8 file and save the segments' link to segments.txt
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

		# Convert & Close everything
		segments_file.close()
		os.remove(fileName + "_segments.txt")
		
		if(convertVods):
			print(colored("[-] Converting", 'red'))
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
parser = argparse.ArgumentParser()
parser.add_argument("-c", "--convert", help="Convert to mp4", action="store_true")
convertVods = parser.parse_args().convert

try:
	vods = open("VODs.txt", 'r')
except:
	print(colored("[+] No VODs to download", 'green'))
	sys.exit()
failedVods = []

for line in vods:
	fileName = line.split('==')[0].strip()
	base_url = getIndexUrl(line.split('==')[1].strip())
	if(base_url):
		fetchSegments(base_url)
		downloadSegments()
vods.close()
os.remove("VODs.txt")

if len(failedVods) > 0:
	with open('VODs.txt', 'w') as f:
		for item in failedVods:
			f.write("%s\n" % item)