import { questionModel } from '../models/questionModel'

export const Questions = [
    new questionModel('How is your budget like?', 'Very limited', 'Just fine', 'Not a problem', 'budget'),
    new questionModel('How many space would you need?', 'Not much', 'Enough', 'A freighter', 'volume'),
    new questionModel('What are your concerns about fuel consumption?', 'Do not care', 'The less the better', 'Looking for 0 cost', 'fuel'),
    new questionModel('Would you sacrifice some practical space for high-end design?', 'Obviously yes', 'Can I have both?', 'No way', 'type'),
    new questionModel('Are you looking for some excitement?', 'Not really', 'Mild powered', 'Sure thing', 'power'),
    new questionModel('Would you rather find a higher quality even if it also has a higher mileage?', 'Sure thing', 'Balance is key here', 'Not really', 'mileage'),
]