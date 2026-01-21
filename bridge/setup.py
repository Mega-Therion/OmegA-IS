"""Setup script for CollectiveBrain V1."""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="collectivebrain",
    version="1.0.0",
    author="gAIng Collective",
    author_email="contact@gaing-collective.io",
    description="Decentralized multi-agent collective brain with DCBFT consensus",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Mega-Therion/CollectiveBrain_V1",
    packages=find_packages(exclude=["tests", "tests.*"]),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.11",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "ruff>=0.1.0",
            "mypy>=1.0.0",
        ],
        "production": [
            "redis>=4.5.0",
            "pymilvus>=2.3.0",
            "neo4j>=5.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "collectivebrain=main:main",
        ],
    },
    keywords="ai, agents, multi-agent, consensus, dcbft, collective-intelligence",
    project_urls={
        "Bug Reports": "https://github.com/Mega-Therion/CollectiveBrain_V1/issues",
        "Source": "https://github.com/Mega-Therion/CollectiveBrain_V1",
    },
)
