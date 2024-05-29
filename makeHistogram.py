import os
import matplotlib.pyplot as plt

# Function to plot the histogram of an image
def plot_histogram(image, title):
    plt.figure()
    plt.hist(image.ravel(), bins=256, range=[0,256])
    plt.title(title)
    plt.xlabel('Pixel Value')
    plt.ylabel('Frequency')
    plt.show()

# Directory where the grayscale images are saved
output_directory = 'output/grayscale_images'

# Analyze histograms of a few processed images
for filename in os.listdir(output_directory):
    if filename.endswith('.png'):
        img_path = os.path.join(output_directory, filename)
        image = plt.imread(img_path)  # Read the image to get pixel values
        plot_histogram(image, f'Histogram of {filename}')
