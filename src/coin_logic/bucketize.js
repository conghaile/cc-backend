import { timeframeMap, bucketizeMap } from './constants.js'

const bucketize = (data, timeframe) => {
    let bucketizedData = []
    let bucketSize = bucketizeMap[timeframe]
    let date = new Date
    let now = date.getTime()
    let i
    if (timeframe === "max") {
        i = 0
    } else {
        i = now - (timeframeMap[timeframe] * 1000)
    }
    for (i; i < now + 1; i += (bucketSize * 1000)) {
        let bucketized = {}
        bucketized['x'] = i
        bucketized['y'] = 0
        bucketizedData.push(bucketized)
    }
    
    for (i = 0; i < data.length; i++) {
        for (let j = 0; j < bucketizedData.length; j++) {
            if ((data[i][1] * 1000) < bucketizedData[j].x) {
                bucketizedData[j].y += 1
                break
            }
        }
    }
    
    return bucketizedData
}

export default bucketize