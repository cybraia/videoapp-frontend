 import React, {createContext, useState, useEffect, useRef} from 'react';
 import { io } from 'socket.io-client';
 import Peer from 'simple-peer';

 const SocketContext = createContext();

 const socket = io('https://videoapp-server.onrender.com');

 const ContextProvider = ({children}) => {
    const [stream, setStream] = useState(null);
    const [me, setMe] = useState('');
    
    const [call, setCall] = useState({});

    //for answer call 
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);

    //for calling another user
    const [name, setName] = useState('');

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({video: true, audio: true})
        .then((currentStream) => {
            setStream(currentStream);

            myVideo.current.srcObject = currentStream;
        });

        socket.on('me', (id) => setMe(id));

        socket.on('calluser', ({from, name: callerName, signal}) => {
            setCall({isReceivedCall: true, from, name: callerName, signal})
        });
    }, []);

    const answerCall = () => {
        setCallAccepted(true);

        //peer behaves similar to socket.
        //it has some actions and some handlers when we call someone or answer a call
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on('signal', (data) => {
            //establishing connection
            socket.emit('answercall', {signal: data, to: call.from});
        })
        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream;
        });
        //we get the signal from the caller through socket
        peer.signal(call.signal);

        //the current connection is established by using the peer
        connectionRef.current = peer;
    }

    const callUser = (id) => {
        //initiator is the one who is calling so its true
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('calluser', {userToCall: id, signalData: data, from: me, name: name});
        });
        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream;
        });
        socket.on('callaccepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });
        connectionRef.current = peer;
    }


    const leaveCall = () => {
        setCallEnded = true;
        connectionRef.current.destroy();
        window.location.reload();
    }

    return(
        <SocketContext.Provider value={{ call, callAccepted, myVideo, userVideo, stream, name, setName, callEnded, me, callUser, leaveCall, answerCall}}>
            {children}
        </SocketContext.Provider>
    )

 }

 export { ContextProvider, SocketContext };