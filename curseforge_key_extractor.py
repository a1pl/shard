#!/usr/bin/env python3
F=len
A=print
import requests as H,zlib as I,sys as B
J='https://curseforge.overwolf.com/electron/linux/CurseForge-0.198.1-21.AppImage'
D=82926761
K=84196
R=131072
def E():
	try:
		A(f"getting curseforge API key from {J}...");A(f"requesting bytes {D}-{D+K}...");S=f"bytes={D}-{D+K}";T={'Range':S};L=H.get(J,headers=T,timeout=30);L.raise_for_status();M=L.content;A(f"Downloaded {F(M)} bytes (compressed)");U=R.to_bytes(4,byteorder='big');V=U+M
		try:E=I.decompress(V)
		except I.error as C:A(f"decompression error: {C}",file=B.stderr);return
		A(f"Decompressed to {F(E)} bytes");G=b'"cfCoreApiKey":"';N=E.find(G)
		if N==-1:A(f"couldnt find string {G.decode()}",file=B.stderr);return
		O=N+F(G);P=E.find(b'"',O)
		if P==-1:A("no closing quote on value",file=B.stderr);return
		Q=E[O:P].decode('utf-8');A(f"success: {Q}");return Q
	except H.RequestException as C:A(f"network request failed: {C}",file=B.stderr);return
	except Exception as C:A(f"Error: {C}",file=B.stderr);return
if __name__=='__main__':
	C=E()
	if C:A(f"\nAPI Key: {C}");B.exit(0)
	else:A('failed',file=B.stderr);B.exit(1)
