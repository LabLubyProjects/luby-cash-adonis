import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: 'luby-cash',
  brokers: ['localhost:9092'],
})

const kafkaProducer = kafka.producer()

export async function produce(message: any, topic: string): Promise<void> {
  await kafkaProducer.connect()
  await kafkaProducer.send({
    topic: topic,
    messages: [{ value: JSON.stringify(message) }],
  })
  await kafkaProducer.disconnect()
}
