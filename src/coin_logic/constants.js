const timeframeMap = {
    "24_hours": 86400,
    "7_days": 604800,
    "14_days": 1209600,
    "30_days": 2592000,
    "90_days": 7776000,
    "180_days": 15552000,
    "365_days": 31536000
}

const bucketizeMap = {
    "24_hours": 60,
    "7_days": 600,
    "14_days": 600,
    "30_days": 3600,
    "90_days": 3600,
    "180_days": 86400,
    "365_days": 86400,
    "max": 86400
}

export { timeframeMap, bucketizeMap }