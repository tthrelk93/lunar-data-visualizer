import os
import requests
from bs4 import BeautifulSoup
import csv
from urllib.parse import urljoin, urlparse
import time

BASE_URL = "https://pds-geosciences.wustl.edu/lunar/clem1-l-lwir-3-rdr-v1/cl_7xxx/data/"

def get_links(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    links = []
    for a in soup.find_all('a', href=True):
        link = a['href']
        full_link = urljoin(url, link)
        if full_link.startswith(BASE_URL) and not any(fragment in full_link for fragment in ['#', '?']):
            links.append(full_link)
    return links

def traverse_and_download(url, download_dir, visited=None):
    if visited is None:
        visited = set()

    if url in visited:
        return
    visited.add(url)

    print(f'Traversing URL: {url}')
    links = get_links(url)
    for link in links:
        if link.endswith('/'):
            subdir = os.path.basename(os.path.normpath(link))
            subdir_path = os.path.join(download_dir, subdir)
            ensure_directory_exists(subdir_path)
            traverse_and_download(link, subdir_path, visited)
        elif link.endswith('.img') or link.endswith('.xml') or link.endswith('.csv'):
            download_file(link, download_dir)

def download_file(url, download_dir, retries=3):
    local_filename = os.path.join(download_dir, os.path.basename(url))
    if not os.path.exists(local_filename):
        for attempt in range(retries):
            try:
                print(f'Downloading {url} to {local_filename} (Attempt {attempt + 1})')
                with requests.get(url, stream=True, timeout=60) as r:
                    r.raise_for_status()
                    with open(local_filename, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                print(f'Downloaded {local_filename}')
                break
            except requests.exceptions.RequestException as e:
                print(f'Error downloading {url}: {e}')
                if attempt < retries - 1:
                    time.sleep(5)  # Wait for 5 seconds before retrying
                else:
                    print(f'Failed to download {url} after {retries} attempts')
    else:
        print(f'Skipping {local_filename}, already exists')

def ensure_directory_exists(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def parse_csv_files(csv_files):
    parsed_data = []
    for csv_file in csv_files:
        with open(csv_file, 'r') as f:
            reader = csv.reader(f)
            headers = next(reader)  # Assuming the first row is the header
            for row in reader:
                parsed_data.append(dict(zip(headers, row)))
    return parsed_data

# Downloading all .img, .xml, and .csv files
download_directory = 'downloaded_files'
ensure_directory_exists(download_directory)
traverse_and_download(BASE_URL, download_directory)

# Process CSV files if any
csv_files = [os.path.join(root, f) for root, _, files in os.walk(download_directory) for f in files if f.endswith('.csv')]
parsed_data = parse_csv_files(csv_files)

print(f'Parsed CSV data: {parsed_data[:5]}')  # Print first 5 entries for verification

# Additional processing logic goes here (e.g., image corrections, generating grayscale images, etc.)
