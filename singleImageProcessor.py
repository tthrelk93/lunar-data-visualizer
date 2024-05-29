import os
import numpy as np
import matplotlib.pyplot as plt
import csv

def read_pds3_header(filepath):
    print(f"Reading header from {filepath}")
    with open(filepath, 'rb') as file:
        header = b''
        while b'END' not in header:
            header += file.read(1)
        
        header = header.decode('utf-8', errors='ignore')
    
    metadata = {}
    for line in header.splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            metadata[key.strip()] = value.strip()
    
    print(f"Extracted metadata: {metadata}")
    return metadata

def read_img_file(filepath):
    print(f"Reading image file {filepath}")
    metadata = read_pds3_header(filepath)
    
    try:
        width = int(metadata['LINE_SAMPLES'])
        height = int(metadata['LINES'])
        record_bytes = int(metadata['RECORD_BYTES'])
        sample_bits = int(metadata['SAMPLE_BITS'])
    except KeyError as e:
        raise ValueError(f"Missing expected metadata in the header: {e}")
    
    print(f"Image dimensions: width={width}, height={height}, record_bytes={record_bytes}, sample_bits={sample_bits}")
    
    dtype = None
    if sample_bits == 8:
        dtype = np.uint8
    elif sample_bits == 16:
        dtype = np.uint16
    elif sample_bits == 32:
        dtype = np.float32  # PC_REAL often indicates floating point data
    else:
        raise ValueError(f"Unsupported sample bits: {sample_bits}")
    
    with open(filepath, 'rb') as file:
        # Skip the header
        header_length = record_bytes * int(metadata['LABEL_RECORDS'])
        file.seek(header_length, os.SEEK_SET)
        
        # Read the image data
        data = np.fromfile(file, dtype=dtype)
    
    print(f"Read {len(data)} data points")
    
    if width * height != len(data):
        raise ValueError(f"Data size {len(data)} does not match the expected dimensions ({width}x{height}).")
    
    image = data.reshape((height, width))
    print(f"Successfully read and reshaped image data from {filepath}")
    return image, metadata

def apply_corrections(image, dark_current, flat_field):
    print("Applying corrections...")
    corrected_image = image - dark_current
    corrected_image = corrected_image / flat_field
    print("Corrections applied")
    return corrected_image

def generate_grayscale_image(corrected_image, output_filepath):
    print(f"Generating grayscale image {output_filepath}")
    # Ensure the figure size is set correctly
    fig = plt.figure(figsize=(1.28, 1.28), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1], frameon=False, aspect='auto')
    ax.set_xticks([])
    ax.set_yticks([])
    
    plt.imshow(corrected_image, cmap='gray', aspect='auto')
    plt.savefig(output_filepath, dpi=100, bbox_inches='tight', pad_inches=0, transparent=True)
    plt.close(fig)
    print(f"Grayscale image saved to {output_filepath}")

def plot_histogram(image, title):
    plt.figure()
    plt.hist(image.ravel(), bins=256, range=[0,256])
    plt.title(title)
    plt.xlabel('Pixel Value')
    plt.ylabel('Frequency')
    plt.show()

def save_metadata(metadata, output_filepath):
    print(f"Saving metadata to {output_filepath}")
    with open(output_filepath, 'w') as f:
        writer = csv.writer(f)
        for key, value in metadata.items():
            writer.writerow([key, value])
    print(f"Metadata saved to {output_filepath}")

def get_calibration_files(rev_directory):
    calib_directory = os.path.join(rev_directory, 'calib')
    dark_current_files = []
    flat_field_files = []
    
    if not os.path.exists(calib_directory):
        return dark_current_files, flat_field_files
    
    for root, dirs, files in os.walk(calib_directory):
        for file in files:
            if file.startswith('bp'):
                dark_current_files.append(os.path.join(root, file))
            elif file.startswith('ff'):
                flat_field_files.append(os.path.join(root, file))
    
    return dark_current_files, flat_field_files

# Function to select the appropriate calibration file
def select_calibration_file(calibration_files, latitude_bin):
    for file in calibration_files:
        if latitude_bin in file:
            return file
    raise ValueError(f"No calibration file found for latitude bin {latitude_bin}")

# Paths to the directories and files
base_directory = 'downloaded_files'  # Base directory for input files
output_base_directory = 'output/grayscale_images'

# Ensure the output directory exists
print(f"Ensuring output directory {output_base_directory} exists")
os.makedirs(output_base_directory, exist_ok=True)

# Process images recursively
for root, dirs, files in os.walk(base_directory):
    print(f"Current directory: {root}")
    print(f"Directories: {dirs}")
    print(f"Files: {files}")

    # Check if we're in a revNNN directory
   # if any(d.lower() == 'calib' for d in dirs):
    rev_directory = os.path.dirname(root)
    dark_current_files, flat_field_files = get_calibration_files(rev_directory)
    
    if not dark_current_files or not flat_field_files:
        print(f"No calibration files found in {rev_directory}/calib, skipping")
        continue

    for file in files:
        if file.endswith('.img') and not file.startswith(('bp', 'ff')):
            img_path = os.path.join(root, file)
            relative_path = os.path.relpath(root, base_directory)
            output_directory = os.path.join(output_base_directory, relative_path)
            os.makedirs(output_directory, exist_ok=True)
            output_filepath = os.path.join(output_directory, file.replace('.img', '.png'))
            metadata_filepath = os.path.join(output_directory, file.replace('.img', '_metadata.csv'))

            print(f"Processing image {file} in {root}...")

            image, metadata = read_img_file(img_path)
            print(f"Original image stats - min: {image.min()}, max: {image.max()}, mean: {image.mean()}")

            # Extract the latitude bin from the filename
            latitude_bin = file[6].lower()

            # Generate and save the grayscale image
            generate_grayscale_image(image, output_filepath)

            # Save metadata
            save_metadata(metadata, metadata_filepath)
