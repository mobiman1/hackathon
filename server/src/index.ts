import * as WebSocket from 'ws';
import Slot from './games/Slots';
import Users from './Users';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync'

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ users: [] })
    .write()

let usersList = new Users();



const wss = new WebSocket.Server({ port: 8080 });
wss.on('error', (e)=>{
    console.log(e); 
})

wss.on('connection', (ws) => {
    console.log("connected");    
    
    let slot = new Slot("", 1)
    let ethAddress = '';
    ws.on("message", function incoming(message: any) {        
        if (message.startsWith("login ")) {
            ethAddress = message.split(" ")[1];
            console.log(ethAddress);
            let result = db.get('users').find({ eth: ethAddress }).size().value()
            if(result == 0) {
                db.get('users').push({eth: ethAddress, balance: 1000}).write();
            }
            let value = db.get('users').find({ eth: ethAddress }).value();
            let noOtherWay = JSON.parse(JSON.stringify(value))            
            ws.send("balance " + noOtherWay.balance)
        }
        if (message == "SlotProvably") {
            ws.send("SlotProva "+slot.serverHash)
        }
        if (message.indexOf("SlotSpin") == 0) {
            let clientSeed = message.split(" ")[1];
            slot.clientSeed = clientSeed;
            let result = db.get('users').find({ eth: ethAddress }).value()
            let noOtherWay = JSON.parse(JSON.stringify(result))
            if (noOtherWay.balance >= 1){
                ws.send(slot.getSlotNumbers())
                noOtherWay.balance--;
                if(slot.result() != 0){
                    noOtherWay.balance += slot.result();
                }
                db.get('users')
                    .find({ eth: ethAddress })
                    .assign({ balance: noOtherWay.balance })
                    .write()
                //users.update(result);
                ws.send("balance " + noOtherWay.balance)
                let numbers = slot.getSlotNumbers().split('');
                let dataToSend = { serverSeed: slot.serverSeed, result: slot.result(), numbers: numbers, nextSSH: '' }
                slot = new Slot('', 1);
                dataToSend.nextSSH = slot.serverHash;
                ws.send("SlotResult " + JSON.stringify(dataToSend))
            }
        }
    });

});
