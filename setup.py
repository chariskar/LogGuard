from setuptools import setup, find_packages



setup(
    name='LogGuard',
    version='0.2.9',
    description='A simple Python Logger',
    author='Charilaos Karametos',
    packages=find_packages(),
    install_requires=[
        "pylint==3.1.0",
        "snowballstemmer==2.2.0",
        "tomlkit==0.12.4"
        ],
    package_data={'': ['log_settings.json']},
    license="MIT",
    python_requires=">=3.6",
    url='https://github.com/chariskar/LogGuard/tree/LogGuard-PY'

  
)
