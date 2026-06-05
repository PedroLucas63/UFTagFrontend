# Depuração sem Fio (ADB over Wi-Fi)

Este guia ensina como conectar o seu celular físico à rede Wi-Fi para testar e depurar o aplicativo React Native sem a necessidade de mantê-lo conectado ao cabo USB.

---

## Pré-requisitos
* O celular e o computador **precisam** estar conectados na mesma rede Wi-Fi.

---

## Método 1: Para Android 11 ou superior (Sem usar o cabo USB)

1. **Ative a Depuração sem Fio**:
   * No celular, vá em **Configurações** -> **Opções do desenvolvedor**.
   * Ative a opção **Depuração por sem fio** (Wireless debugging).
   * Toque em cima do texto *Depuração por sem fio* para abrir a tela de detalhes.

2. **Emparelhar o Dispositivo**:
   * Na tela de detalhes, toque em **Emparelhar dispositivo com código** (Pair device with pairing code).
   * Anote o **IP e Porta de Emparelhamento** (ex: `192.168.1.15:38421`) e o **Código de emparelhamento de 6 dígitos**.
   * No terminal do computador, execute:
     ```sh
     adb pair <IP>:<PORTA_DE_EMPARELHAMENTO>
     # Exemplo: adb pair 192.168.1.15:38421
     ```
   * Insira o código de 6 dígitos quando solicitado.

3. **Conectar**:
   * Volte à tela principal de *Depuração por sem fio* no celular.
   * Procure pelo campo **Endereço IP e porta** de conexão (ex: `192.168.1.15:42135` — *note que a porta é diferente da porta de emparelhamento anterior*).
   * Conecte rodando:
     ```sh
     adb connect <IP>:<PORTA_DE_CONEXAO>
     # Exemplo: adb connect 192.168.1.15:42135
     ```

---

## Método 2: Para qualquer versão do Android (Com cabo USB na primeira vez)

1. Conecte o celular ao computador via **cabo USB**.
2. Abra a porta TCP/IP `5555` no celular rodando no computador:
   ```sh
   adb tcpip 5555
   ```
3. Descubra o IP do celular na sua rede Wi-Fi (*Configurações -> Sobre o telefone -> Status -> Endereço IP*, ex: `192.168.1.15`).
4. **Desconecte o cabo USB**.
5. Conecte pelo terminal:
   ```sh
   adb connect <IP_DO_CELULAR>:5555
   # Exemplo: adb connect 192.168.1.15:5555
   ```

---

## Resolução de Problemas / Erros Comuns

### Erro: `error: more than one device/emulator`
Esse erro ocorre quando você executa um comando ADB (como `adb tcpip 5555`), mas tem mais de um dispositivo ativo (ex: um emulador aberto + um celular físico).

**Solução**:
Direcione o comando especificamente para o dispositivo desejado:

1. Liste os dispositivos conectados:
   ```sh
   adb devices
   ```
   *Exemplo de saída:*
   ```text
   List of devices attached
   8c582197          device
   192.168.0.3:37763 device
   ```
2. Direcione usando a flag `-d` (para enviar apenas ao celular físico conectado via USB):
   ```sh
   adb -d tcpip 5555
   ```
3. Ou utilize a flag `-s` informando o número serial listado no comando anterior:
   ```sh
   adb -s 8c582197 tcpip 5555
   ```

---

## Passos Finais (Crucial para React Native)

Sempre que reconectar o dispositivo via Wi-Fi, lembre-se de redirecionar as portas locais para o celular conseguir achar o Metro bundler e o backend:

```sh
# Redireciona o Metro Bundler
adb reverse tcp:8081 tcp:8081

# Redireciona o Servidor da API Backend
adb reverse tcp:5156 tcp:5156
```

Após isso, basta rodar o comando de execução na pasta do frontend:
```sh
npm run android
```
